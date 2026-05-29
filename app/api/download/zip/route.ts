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

    if (type !== "documents" && type !== "trainings" && type !== "all") {
      return NextResponse.json({ error: "type deve ser 'documents', 'trainings' ou 'all'" }, { status: 400 })
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

    const selectQuery: any = {}
    if (type === "documents" || type === "all") {
      selectQuery.documents = {
        select: { id: true, type: true, name: true, fileUrl: true },
        where: { fileUrl: { not: null }, isEnabled: true },
      }
    }
    if (type === "trainings" || type === "all") {
      selectQuery.trainings = {
        select: { id: true, type: true, name: true, fileUrl: true },
        where: { fileUrl: { not: null }, isEnabled: true },
      }
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: {
        name: true,
        ...selectQuery
      },
    }) as any

    const publicDomain = process.env.CLOUDFLARE_PUBLIC_DOMAIN || ""
    const zip = new JSZip()
    const folder = zip.folder(employeeBase.name) || zip

    if (type === "all") {
      const personalDocs = employee?.documents || []
      const trainingsDocs = employee?.trainings || []

      if (!personalDocs.length && !trainingsDocs.length) {
        return NextResponse.json(
          { error: "Nenhum arquivo habilitado disponível para este funcionário" },
          { status: 404 }
        )
      }

      if (personalDocs.length) {
        const subFolder = folder.folder("Documentos Pessoais") || folder
        await Promise.all(
          personalDocs.map(async (item: any, index: number) => {
            const fileUrl = item.fileUrl!
            if (!fileUrl.startsWith(publicDomain)) return

            try {
              const res = await fetch(fileUrl)
              if (!res.ok) return

              const ext = fileUrl.split(".").pop()?.split("?")[0] || "bin"
              const label = item.name || item.type
              const safeLabel = label.replace(/[/\\\s:*?"<>|]/g, "_")
              const filename = `${String(index + 1).padStart(2, "0")}_${safeLabel}.${ext}`

              const buffer = await res.arrayBuffer()
              subFolder.file(filename, buffer)
            } catch {}
          })
        )
      }

      if (trainingsDocs.length) {
        const subFolder = folder.folder("Treinamentos") || folder
        await Promise.all(
          trainingsDocs.map(async (item: any, index: number) => {
            const fileUrl = item.fileUrl!
            if (!fileUrl.startsWith(publicDomain)) return

            try {
              const res = await fetch(fileUrl)
              if (!res.ok) return

              const ext = fileUrl.split(".").pop()?.split("?")[0] || "bin"
              const label = item.name || item.type
              const safeLabel = label.replace(/[/\\\s:*?"<>|]/g, "_")
              const filename = `${String(index + 1).padStart(2, "0")}_${safeLabel}.${ext}`

              const buffer = await res.arrayBuffer()
              subFolder.file(filename, buffer)
            } catch {}
          })
        )
      }
    } else {
      const items = type === "documents" ? employee?.documents : employee?.trainings
      const allFiles: { fileUrl: string; label: string }[] = (items || []).map(
        (item: { type: string; name?: string | null; fileUrl: string | null }) => ({
          fileUrl: item.fileUrl!,
          label: item.name || item.type,
        })
      )

      const zipLabel = type === "documents" ? "documentos pessoais" : "treinamentos"

      if (!allFiles.length) {
        return NextResponse.json(
          { error: `Nenhum arquivo de ${zipLabel} habilitado disponível para este funcionário` },
          { status: 404 }
        )
      }

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
          } catch {}
        })
      )
    }

    const zipLabel = type === "all" ? "documentos_completos" : type === "documents" ? "documentos_pessoais" : "treinamentos"
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
