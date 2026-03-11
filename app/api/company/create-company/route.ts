import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { isSuperAdmin, unauthorizedResponse, forbiddenResponse } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        if (!(await isSuperAdmin(req))) {
            return forbiddenResponse()
        }

        const body = await req.json()

        const company = await db.company.create({
            data: {
                name: body.name,
                imageUrl: body.image_url,
                cnpj: body.cnpj,
                email: body.email,
                phone: body.phone,
                address: body.address,
                state: body.state,
                city: body.city,
                responsible: body.responsible
            }
        })

        const hashPassword = await bcrypt.hash('admin112233@', 10)

        const user = await db.user.create({
            data: {
                name: `ADM - ${company.name}`,
                email: body.email,
                password: hashPassword,
                role: "ADMIN",
                companyId: company.id,
            }
        })

        if (user.id) {
            await db.notificationPreferences.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id }
            })
        }

        return NextResponse.json({ response: { company, user } }, { status: 201 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}