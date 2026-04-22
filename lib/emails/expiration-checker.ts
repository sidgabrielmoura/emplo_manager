
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

        
        const globalSuperadmins = await db.superadmin.findMany({
            where: {
                notificationPreferences: {
                    documentExpirationAlerts: true,
                },
            },
            include: {
                notificationPreferences: true,
            },
        });

        const expiringDocuments = await db.document.findMany({
            where: {
                expiresAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: { not: "EXPIRED" },
            },
            include: {
                employee: {
                    include: {
                        company: {
                            include: {
                                users: {
                                    where: {
                                        notificationPreferences: {
                                            documentExpirationAlerts: true,
                                        },
                                    },
                                    include: {
                                        notificationPreferences: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const expiringTrainings = await db.training.findMany({
            where: {
                expiresAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: { not: "EXPIRED" },
            },
            include: {
                employee: {
                    include: {
                        company: {
                            include: {
                                users: {
                                    where: {
                                        notificationPreferences: {
                                            documentExpirationAlerts: true,
                                        },
                                    },
                                    include: {
                                        notificationPreferences: true,
                                    },
                                },
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
        }>();

        const processItem = (item: any, type: 'document' | 'training') => {
            const itemsLabel = type === 'document' ? item.type : item.type;
            const formattedDate = format(item.expiresAt, "dd/MM/yyyy", { locale: ptBR });

            
            if (item.employee?.company?.users) {
                item.employee.company.users.forEach((user: any) => {
                    const email = user.notificationPreferences?.email || user.email;
                    if (!adminNotifications.has(email)) {
                        adminNotifications.set(email, {
                            adminEmail: email,
                            adminName: user.name,
                            items: [],
                        });
                    }
                    adminNotifications.get(email)!.items.push({
                        employeeName: item.employee.name,
                        documentType: itemsLabel,
                        expiresAt: formattedDate,
                    });
                });
            }

            
            globalSuperadmins.forEach((sa: any) => {
                const email = sa.notificationPreferences?.email || sa.email;
                if (!adminNotifications.has(email)) {
                    adminNotifications.set(email, {
                        adminEmail: email,
                        adminName: sa.name,
                        items: [],
                    });
                }
                adminNotifications.get(email)!.items.push({
                    employeeName: item.employee.name,
                    documentType: itemsLabel,
                    expiresAt: formattedDate,
                });
            });
        };

        expiringDocuments.forEach(doc => processItem(doc, 'document'));
        expiringTrainings.forEach(training => processItem(training, 'training'));

        for (const notification of adminNotifications.values()) {
            await EmailService.sendExpirationAlert({
                to: notification.adminEmail,
                adminName: notification.adminName,
                days,
                expiringItems: notification.items,
            });
        }
    }
}
