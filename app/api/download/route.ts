import { getServerUserId, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const fileUrl = searchParams.get("fileUrl")
    const fileName = searchParams.get("fileName") || "documento"

    if (!fileUrl) {
      return NextResponse.json({ error: "fileUrl é obrigatório" }, { status: 400 })
    }

    
    const publicDomain = process.env.CLOUDFLARE_PUBLIC_DOMAIN || ""
    if (!fileUrl.startsWith(publicDomain)) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 })
    }

    const response = await fetch(fileUrl)
    if (!response.ok) {
      return NextResponse.json({ error: "Falha ao buscar o arquivo" }, { status: 502 })
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream"
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": buffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Erro ao fazer download" }, { status: 500 })
  }
}
