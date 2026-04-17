import db from "@/lib/prisma"
import bcrypt from "bcrypt"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, security_key } = await req.json()

    if (security_key !== process.env.SECURITY_KEY) {
      return NextResponse.json({ error: "Chave de segurança inválida" }, { status: 401 })
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const superadmin = await db.superadmin.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    return NextResponse.json(superadmin, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Erro ao criar superadmin" },
      { status: 500 }
    )
  }
}
