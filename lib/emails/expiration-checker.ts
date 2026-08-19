import db from "@/lib/prisma";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { EmailService } from "./service";
import { ptBR } from "date-fns/locale";

export async function checkAndSendExpirationAlerts() {
    const intervals = [0, 3, 10, 30];
    const today = startOfDay(new Date());

    for (const days of intervals) {
        const targetDate = addDays(today, days);
        const startDate = startOfDay(targetDate);
        const endDate = endOfDay(targetDate);

        // 1. Employee Documents
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
                    status: "ACTIVE",
                    dismissedAt: null,
                    company: {
                        status: "ACTIVE",
                        deletedAt: null,
                    },
                },
            },
            include: {
                employee: {
                    include: {
                        company: {
                            include: {
                                notificationRecipients: {
                                    where: {
                                        documentExpirationAlerts: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        // 2. Employee Trainings
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
                    status: "ACTIVE",
                    dismissedAt: null,
                    company: {
                        status: "ACTIVE",
                        deletedAt: null,
                    },
                },
            },
            include: {
                employee: {
                    include: {
                        company: {
                            include: {
                                notificationRecipients: {
                                    where: {
                                        documentExpirationAlerts: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        // 3. Company Documents
        const expiringCompanyDocs = await db.companyDocument.findMany({
            where: {
                expiresAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: { not: "EXPIRED" },
                deletedAt: null,
                company: {
                    status: "ACTIVE",
                    deletedAt: null,
                },
            },
            include: {
                company: {
                    include: {
                        notificationRecipients: {
                            where: {
                                documentExpirationAlerts: true,
                            },
                        },
                    },
                },
            },
        });

        const recipientNotifications = new Map<string, {
            email: string;
            name: string;
            items: { employeeName: string; documentType: string; expiresAt: string }[];
            companyId?: string;
        }>();

        const addItemToRecipient = (
            email: string,
            name: string,
            companyId: string | undefined,
            itemData: { employeeName: string; documentType: string; expiresAt: string }
        ) => {
            const normalizedEmail = email.trim().toLowerCase();
            if (!normalizedEmail) return;

            if (!recipientNotifications.has(normalizedEmail)) {
                recipientNotifications.set(normalizedEmail, {
                    email: normalizedEmail,
                    name: name || "Gestor",
                    items: [],
                    companyId,
                });
            }

            const recipientObj = recipientNotifications.get(normalizedEmail)!;
            // Prevent duplicate item entries in the same email
            const exists = recipientObj.items.some(
                i => i.employeeName === itemData.employeeName &&
                     i.documentType === itemData.documentType &&
                     i.expiresAt === itemData.expiresAt
            );

            if (!exists) {
                recipientObj.items.push(itemData);
            }
        };

        const processEmployeeItem = (item: any, type: 'document' | 'training') => {
            if (!item.employee) return;

            const itemsLabel = item.name || item.type;
            const formattedDate = item.expiresAt ? format(item.expiresAt, "dd/MM/yyyy", { locale: ptBR }) : "Data não informada";
            const employeeName = item.employee.name || "Funcionário";
            const company = item.employee.company;
            const companyId = item.employee.companyId || company?.id;

            const itemData = {
                employeeName,
                documentType: itemsLabel,
                expiresAt: formattedDate,
            };

            // Send exclusively to company custom notification recipients
            if (company?.notificationRecipients) {
                company.notificationRecipients.forEach((rec: any) => {
                    addItemToRecipient(rec.email, rec.name, companyId, itemData);
                });
            }
        };

        const processCompanyDocItem = (item: any) => {
            if (!item.company) return;

            const itemsLabel = item.name || item.type;
            const formattedDate = item.expiresAt ? format(item.expiresAt, "dd/MM/yyyy", { locale: ptBR }) : "Data não informada";
            const company = item.company;
            const companyId = company.id;

            const itemData = {
                employeeName: `Documento da Empresa (${company.name})`,
                documentType: itemsLabel,
                expiresAt: formattedDate,
            };

            // Send exclusively to company custom notification recipients
            if (company.notificationRecipients) {
                company.notificationRecipients.forEach((rec: any) => {
                    addItemToRecipient(rec.email, rec.name, companyId, itemData);
                });
            }
        };

        expiringDocuments.forEach(doc => processEmployeeItem(doc, 'document'));
        expiringTrainings.forEach(training => processEmployeeItem(training, 'training'));
        expiringCompanyDocs.forEach(compDoc => processCompanyDocItem(compDoc));

        // Dispatch alerts exclusively to recipients with expiring items
        for (const notification of recipientNotifications.values()) {
            if (notification.items.length > 0) {
                await EmailService.sendExpirationAlert({
                    to: notification.email,
                    adminName: notification.name,
                    days,
                    expiringItems: notification.items,
                    companyId: notification.companyId,
                });
            }
        }
    }
}
