import db from "@/lib/prisma"
import bcrypt from "bcrypt"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdmin, unauthorizedResponse, forbiddenResponse } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const isSuper = await isSuperAdmin(req)
    if (!isSuper) return forbiddenResponse()

    const { name, email, password } = await req.json()

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
