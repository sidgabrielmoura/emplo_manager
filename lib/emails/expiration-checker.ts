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

        // Fetch global superadmins who haven't explicitly disabled alerts (or where preferences are not yet set)
        const globalSuperadmins = await db.superadmin.findMany({
            where: {
                OR: [
                    { notificationPreferences: { documentExpirationAlerts: true } },
                    { notificationPreferences: null },
                ],
            },
            include: {
                notificationPreferences: true,
            },
        });

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
                                users: {
                                    where: {
                                        OR: [
                                            { notificationPreferences: { documentExpirationAlerts: true } },
                                            { notificationPreferences: null },
                                        ],
                                    },
                                    include: {
                                        notificationPreferences: true,
                                    },
                                },
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
                                users: {
                                    where: {
                                        OR: [
                                            { notificationPreferences: { documentExpirationAlerts: true } },
                                            { notificationPreferences: null },
                                        ],
                                    },
                                    include: {
                                        notificationPreferences: true,
                                    },
                                },
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
                        users: {
                            where: {
                                OR: [
                                    { notificationPreferences: { documentExpirationAlerts: true } },
                                    { notificationPreferences: null },
                                ],
                            },
                            include: {
                                notificationPreferences: true,
                            },
                        },
                        notificationRecipients: {
                            where: {
                                documentExpirationAlerts: true,
                            },
                        },
                    },
                },
            },
        });

        const adminNotifications = new Map<string, {
            adminEmail: string;
            adminName: string;
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

            if (!adminNotifications.has(normalizedEmail)) {
                adminNotifications.set(normalizedEmail, {
                    adminEmail: normalizedEmail,
                    adminName: name,
                    items: [],
                    companyId,
                });
            }

            const recipientObj = adminNotifications.get(normalizedEmail)!;
            // Prevent duplicate item entries
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

            // 1. Company Users
            if (company?.users) {
                company.users.forEach((user: any) => {
                    const email = user.notificationPreferences?.email || user.email;
                    addItemToRecipient(email, user.name || "Administrador", companyId, itemData);
                });
            }

            // 2. Custom Notification Recipients
            if (company?.notificationRecipients) {
                company.notificationRecipients.forEach((rec: any) => {
                    addItemToRecipient(rec.email, rec.name || "Gestor", companyId, itemData);
                });
            }

            // 3. Global Superadmins
            globalSuperadmins.forEach((sa: any) => {
                const email = sa.notificationPreferences?.email || sa.email;
                const companyName = company?.name ? ` [${company.name}]` : "";
                addItemToRecipient(email, sa.name || "Superadmin", companyId, {
                    employeeName: `${employeeName}${companyName}`,
                    documentType: itemsLabel,
                    expiresAt: formattedDate,
                });
            });
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

            // 1. Company Users
            if (company.users) {
                company.users.forEach((user: any) => {
                    const email = user.notificationPreferences?.email || user.email;
                    addItemToRecipient(email, user.name || "Administrador", companyId, itemData);
                });
            }

            // 2. Custom Notification Recipients
            if (company.notificationRecipients) {
                company.notificationRecipients.forEach((rec: any) => {
                    addItemToRecipient(rec.email, rec.name || "Gestor", companyId, itemData);
                });
            }

            // 3. Global Superadmins
            globalSuperadmins.forEach((sa: any) => {
                const email = sa.notificationPreferences?.email || sa.email;
                addItemToRecipient(email, sa.name || "Superadmin", companyId, itemData);
            });
        };

        expiringDocuments.forEach(doc => processEmployeeItem(doc, 'document'));
        expiringTrainings.forEach(training => processEmployeeItem(training, 'training'));
        expiringCompanyDocs.forEach(compDoc => processCompanyDocItem(compDoc));

        // Dispatch alerts to all recipients who have expiring items
        for (const notification of adminNotifications.values()) {
            if (notification.items.length > 0) {
                await EmailService.sendExpirationAlert({
                    to: notification.adminEmail,
                    adminName: notification.adminName,
                    days,
                    expiringItems: notification.items,
                    companyId: notification.companyId,
                });
            }
        }
    }
}
