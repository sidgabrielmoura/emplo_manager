
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
    requirementId?: string,
    issuedAt?: Date
}) {
    const issuedAt = params.issuedAt ? new Date(params.issuedAt) : new Date();
    issuedAt.setUTCHours(0, 0, 0, 0);

    let validityDays: number | null = null;

    if (params.requirementId) {
        const req = await db.companyRequiredDocument.findUnique({
            where: { id: params.requirementId },
            select: { validityDays: true }
        });
        validityDays = req?.validityDays || null;
    } else if (params.type === 'CUSTOM' && params.name) {
        
        const req = await db.companyRequiredDocument.findFirst({
            where: { companyId: params.companyId, name: params.name },
            select: { validityDays: true }
        });
        validityDays = req?.validityDays || null;
    } else {
        
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

export async function syncCompanyDocumentExpirations(companyId: string, type: string, name?: string) {
    const documents = await db.companyDocument.findMany({
        where: {
            companyId,
            type,
            ...(name ? { name } : {})
        }
    });

    for (const doc of documents) {
        if (!doc.issuedAt) continue;

        const { expiresAt } = await calculateDocumentDates({
            companyId,
            type,
            name: doc.name || undefined,
            issuedAt: doc.issuedAt
        });

        await db.companyDocument.update({
            where: { id: doc.id },
            data: { expiresAt }
        });
    }

    await updateExpiredStatuses(companyId);
}
