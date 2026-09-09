import { r2 } from "@/lib/r2"
import { getServerUserId, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { sanitizeFileName, inferContentType } from "@/lib/file-utils"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const body = await req.json()
    const { fileName, fileType, folder = "gerenciow" } = body

    if (!fileName) {
      return NextResponse.json({ error: "fileName é obrigatório" }, { status: 400 })
    }

    const bucketName = process.env.CLOUDFLARE_BUCKET_NAME!
    const publicDomain = process.env.CLOUDFLARE_PUBLIC_DOMAIN!

    const safeName = sanitizeFileName(fileName)
    const contentType = inferContentType(fileName, fileType)
    const key = `${folder}/${Date.now()}-${safeName}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })

    // URL assinada com expiração de 1 hora para upload direto
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 })
    const publicUrl = `${publicDomain}/${key}`

    return NextResponse.json({
      uploadUrl,
      url: publicUrl,
      public_id: key,
      originalName: fileName,
      contentType,
    })
  } catch (error) {
    console.error("Presign upload error:", error)
    return NextResponse.json({ error: "Erro ao gerar URL assinada para upload" }, { status: 500 })
  }
}
