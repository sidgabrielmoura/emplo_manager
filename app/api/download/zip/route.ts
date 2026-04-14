import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import db from "@/lib/prisma"
import JSZip from "jszip"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const { employeeId, type = "documents" } = await req.json()

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId é obrigatório" }, { status: 400 })
    }

    if (type !== "documents" && type !== "trainings") {
      return NextResponse.json({ error: "type deve ser 'documents' ou 'trainings'" }, { status: 400 })
    }

    const selectQuery = type === "documents"
      ? {
        name: true,
        documents: {
          select: { id: true, type: true, name: true, fileUrl: true },
          where: { fileUrl: { not: null } },
        },
      }
      : {
        name: true,
        trainings: {
          select: { id: true, type: true, fileUrl: true },
          where: { fileUrl: { not: null } },
        },
      }

    const employeeBase = await db.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true, name: true },
    })

    if (!employeeBase) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
    }

    const hasAccess = await validateCompanyAccess(userId, employeeBase.companyId)
    if (!hasAccess) return forbiddenResponse()

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: selectQuery,
    }) as any

    const publicDomain = process.env.CLOUDFLARE_PUBLIC_DOMAIN || ""

    const items = type === "documents" ? employee?.documents : employee?.trainings
    const allFiles: { fileUrl: string; label: string }[] = (items || []).map(
      (item: { type: string; name?: string | null; fileUrl: string | null }) => ({
        fileUrl: item.fileUrl!,
        label: item.name || item.type,
      })
    )

    const zipLabel = type === "documents" ? "documentos" : "treinamentos"

    if (!allFiles.length) {
      return NextResponse.json(
        { error: `Nenhum arquivo de ${zipLabel} disponível para este funcionário` },
        { status: 404 }
      )
    }

    const zip = new JSZip()
    const folder = zip.folder(employeeBase.name) || zip

    await Promise.all(
      allFiles.map(async ({ fileUrl, label }, index) => {
        if (!fileUrl.startsWith(publicDomain)) return

        try {
          const res = await fetch(fileUrl)
          if (!res.ok) return

          const ext = fileUrl.split(".").pop()?.split("?")[0] || "bin"
          const safeLabel = label.replace(/[/\\\s:*?"<>|]/g, "_")
          const filename = `${String(index + 1).padStart(2, "0")}_${safeLabel}.${ext}`

          const buffer = await res.arrayBuffer()
          folder.file(filename, buffer)
        } catch {
        }
      })
    )

    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" })
    const safeName = employeeBase.name.replace(/\s+/g, "_")

    return new NextResponse(zipArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipLabel}_${safeName}.zip"`,
        "Content-Length": zipArrayBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("ZIP error:", error)
    return NextResponse.json({ error: "Erro ao gerar arquivo ZIP" }, { status: 500 })
  }
}
