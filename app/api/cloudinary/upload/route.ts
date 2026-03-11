import cloudinary from "@/lib/cloudinary"
import { getServerUserId, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

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

    if (!files.length) {
      return NextResponse.json({ error: "Arquivos não enviados" }, { status: 400 })
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

        const result = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: isPDF ? "image" : "auto",
              use_filename: true,
              unique_filename: true,
              public_id: file.name.substring(0, file.name.lastIndexOf(".")),
            },
            (error, result) => {
              if (error) reject(error)
              resolve(result)
            }
          ).end(buffer)
        })

        return {
          url: result.secure_url,
          public_id: result.public_id,
          originalName: file.name,
        }
      })
    )

    return NextResponse.json(uploads.length === 1 ? uploads[0] : uploads)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 })
  }
}
