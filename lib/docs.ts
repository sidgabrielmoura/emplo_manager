
import db from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function updateExpiredStatuses(companyId: string) {
    const today = startOfDay(new Date());

    await Promise.all([
        db.document.updateMany({
            where: {
                employee: { companyId },
                expiresAt: { lt: today },
                status: { not: "EXPIRED" }
            },
            data: { status: "EXPIRED" }
        }),
        db.training.updateMany({
            where: {
                employee: { companyId },
                expiresAt: { lt: today },
                status: { not: "EXPIRED" }
            },
            data: { status: "EXPIRED" }
        }),
        db.companyDocument.updateMany({
            where: {
                companyId,
                expiresAt: { lt: today },
                status: { not: "EXPIRED" }
            },
            data: { status: "EXPIRED" }
        })
    ]);
}

export async function calculateDocumentDates(params: {
    companyId: string,
    type: string,
    name?: string,
    requirementId?: string
}) {
    const issuedAt = new Date();
    issuedAt.setUTCHours(0, 0, 0, 0);

    let validityDays: number | null = null;

    if (params.requirementId) {
        const req = await db.companyRequiredDocument.findUnique({
            where: { id: params.requirementId },
            select: { validityDays: true }
        });
        validityDays = req?.validityDays || null;
    } else if (params.type === 'CUSTOM' && params.name) {
        // Try to find by name for CUSTOM types
        const req = await db.companyRequiredDocument.findFirst({
            where: { companyId: params.companyId, name: params.name },
            select: { validityDays: true }
        });
        validityDays = req?.validityDays || null;
    } else {
        // For standard types (enums)
        const company = await db.company.findUnique({
            where: { id: params.companyId },
            select: { standardDocumentValidity: true }
        });
        const validityMap = (company?.standardDocumentValidity as any) || {};
        validityDays = validityMap[params.type] || null;
    }

    let expiresAt: Date | null = null;
    if (validityDays) {
        expiresAt = new Date(issuedAt);
        expiresAt.setUTCDate(expiresAt.getUTCDate() + validityDays);
    }

    return { issuedAt, expiresAt };
}
