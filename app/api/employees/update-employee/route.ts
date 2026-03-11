import db from "@/lib/prisma";
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json();
        const { id } = body

        if (!id) {
            return NextResponse.json(
                { message: "ID é obrigatório" },
                { status: 400 }
            );
        }

        const existingEmployee = await db.employee.findUnique({
            where: { id },
            select: { companyId: true }
        })

        if (!existingEmployee) {
            return NextResponse.json({ message: "Funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, existingEmployee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const {
            address,
            contactPhone,
            emergencyContact,
            dismissedAt,
            isTerminated,
            ...restPayload
        } = body;

        const updateData: any = {
            ...restPayload,
        };

        if (dismissedAt) {
            updateData.dismissedAt = new Date(dismissedAt);
            updateData.status = "TERMINATED";
        } else if (dismissedAt === "" || dismissedAt === null) {
            updateData.dismissedAt = null;
            updateData.status = "ACTIVE";
        }

        if (address) {
            updateData.address = {
                upsert: {
                    create: {
                        city: address.city || "",
                        district: address.district || "",
                        address: address.street || "",
                        number: address.number || "",
                        cep: address.cep || "",
                        complement: address.complement || "",
                    },
                    update: {
                        city: address.city || "",
                        district: address.district || "",
                        address: address.street || "",
                        number: address.number || "",
                        cep: address.cep || "",
                        complement: address.complement || "",
                    }
                }
            };
        }

        if (contactPhone !== undefined || emergencyContact !== undefined) {
            updateData.contact = {
                upsert: {
                    create: {
                        phone: contactPhone || "",
                        emergencyContact: emergencyContact || "",
                    },
                    update: {
                        phone: contactPhone || "",
                        emergencyContact: emergencyContact || "",
                    }
                }
            };
        }

        const employee = await db.employee.update({
            where: { id },
            data: updateData,
            include: {
                address: true,
                contact: true
            }
        });

        return NextResponse.json(employee);
    } catch (error) {
        console.error("Error updating employee:", error);
        return NextResponse.json(
            { message: "Failed to update employee" },
            { status: 500 }
        );
    }
}