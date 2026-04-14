import { r2 } from "@/lib/r2"
import { getServerUserId, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const formData = await req.formData()

    const singleFile = formData.get("file") as File | null
    const multipleFiles = formData.getAll("files") as File[]

    const files: File[] = multipleFiles.length
      ? multipleFiles
      : singleFile
        ? [singleFile]
        : []

    const folder = (formData.get("folder") as string) || "gerenciow"
    const bucketName = process.env.CLOUDFLARE_BUCKET_NAME!
    const publicDomain = process.env.CLOUDFLARE_PUBLIC_DOMAIN! // Ex: https://xxx.r2.dev or custom domain

    if (!files.length) {
      return NextResponse.json({ error: "Arquivos não enviados" }, { status: 400 })
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Gerar chave única mantendo pasta e nome original
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`
        const key = `${folder}/${fileName}`

        await r2.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: file.type,
          })
        )

        const url = `${publicDomain}/${key}`

        return {
          url: url,
          public_id: key, // Usamos o key como id único equivalente ao do cloudinary
          originalName: file.name,
        }
      })
    )

    return NextResponse.json(uploads.length === 1 ? uploads[0] : uploads)
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Erro ao fazer upload para R2" }, { status: 500 })
  }
}
