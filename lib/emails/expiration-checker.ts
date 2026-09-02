import db from "@/lib/prisma";
import { addDays, startOfDay, format } from "date-fns";
import { EmailService } from "./service";
import { ptBR } from "date-fns/locale";

export async function checkAndSendExpirationAlerts() {
    const today = startOfDay(new Date());
    let totalEmailsSent = 0;
    let totalAlertsGenerated = 0;

    // 1. Fetch all active companies with their registered notification recipients
    const activeCompanies = await db.company.findMany({
        where: {
            status: "ACTIVE",
            deletedAt: null,
        },
        include: {
            notificationRecipients: {
                where: {
                    documentExpirationAlerts: true,
                },
            },
        },
    });

    for (const company of activeCompanies) {
        if (!company.notificationRecipients || company.notificationRecipients.length === 0) {
            continue;
        }

        // Determine the configured notification interval (defaulting to 10 if not set, valid values: 5, 10, 15)
        const interval = [5, 10, 15].includes(company.notificationIntervalDays)
            ? company.notificationIntervalDays
            : 10;

        // Build intervals: 0 (today) + step multiples up to 30 days
        const intervals: number[] = [0];
        for (let d = interval; d <= 30; d += interval) {
            intervals.push(d);
        }

        for (const days of intervals) {
            const targetDate = addDays(today, days);
            
            // Generate full UTC day window for Prisma @db.Date field matching
            const startDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));

            // 1. Employee Documents for this company
            const expiringDocuments = await db.document.findMany({
                where: {
                    expiresAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: { not: "EXPIRED" },
                    isEnabled: true,
                    deletedAt: null,
                    employee: {
                        companyId: company.id,
                        status: "ACTIVE",
                        dismissedAt: null,
                    },
                },
                include: {
                    employee: true,
                },
            });

            // 2. Employee Trainings for this company
            const expiringTrainings = await db.training.findMany({
                where: {
                    expiresAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: { not: "EXPIRED" },
                    isEnabled: true,
                    deletedAt: null,
                    employee: {
                        companyId: company.id,
                        status: "ACTIVE",
                        dismissedAt: null,
                    },
                },
                include: {
                    employee: true,
                },
            });

            // 3. Company Documents for this company
            const expiringCompanyDocs = await db.companyDocument.findMany({
                where: {
                    companyId: company.id,
                    expiresAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: { not: "EXPIRED" },
                    deletedAt: null,
                },
            });

            if (
                expiringDocuments.length === 0 &&
                expiringTrainings.length === 0 &&
                expiringCompanyDocs.length === 0
            ) {
                continue;
            }

            // Build items list
            const rawItems: { employeeName: string; documentType: string; expiresAt: string }[] = [];

            for (const doc of expiringDocuments) {
                const docLabel = doc.name || doc.type || "Documento";
                const formattedDate = doc.expiresAt
                    ? format(doc.expiresAt, "dd/MM/yyyy", { locale: ptBR })
                    : "Data não informada";
                rawItems.push({
                    employeeName: doc.employee?.name || "Funcionário",
                    documentType: docLabel,
                    expiresAt: formattedDate,
                });
            }

            for (const training of expiringTrainings) {
                const trainingLabel = training.name || training.type || "Treinamento";
                const formattedDate = training.expiresAt
                    ? format(training.expiresAt, "dd/MM/yyyy", { locale: ptBR })
                    : "Data não informada";
                rawItems.push({
                    employeeName: training.employee?.name || "Funcionário",
                    documentType: trainingLabel,
                    expiresAt: formattedDate,
                });
            }

            for (const compDoc of expiringCompanyDocs) {
                const compDocLabel = compDoc.name || compDoc.type || "Documento da Empresa";
                const formattedDate = compDoc.expiresAt
                    ? format(compDoc.expiresAt, "dd/MM/yyyy", { locale: ptBR })
                    : "Data não informada";
                rawItems.push({
                    employeeName: `Documento da Empresa (${company.name})`,
                    documentType: compDocLabel,
                    expiresAt: formattedDate,
                });
            }

            // Deduplicate items
            const items = rawItems.filter((item, index, self) =>
                index === self.findIndex((i) =>
                    i.employeeName === item.employeeName &&
                    i.documentType === item.documentType &&
                    i.expiresAt === item.expiresAt
                )
            );

            if (items.length === 0) continue;

            totalAlertsGenerated += items.length;

            // Dispatch alert emails to all company recipients configured for expiration alerts
            for (const recipient of company.notificationRecipients) {
                const normalizedEmail = recipient.email.trim().toLowerCase();
                if (!normalizedEmail) continue;

                await EmailService.sendExpirationAlert({
                    to: normalizedEmail,
                    recipientName: recipient.name,
                    adminName: recipient.name || "Gestor",
                    days,
                    expiringItems: items,
                    companyId: company.id,
                });

                totalEmailsSent++;
            }
        }
    }

    return {
        success: true,
        companiesProcessed: activeCompanies.length,
        totalAlertsGenerated,
        totalEmailsSent,
    };
}
