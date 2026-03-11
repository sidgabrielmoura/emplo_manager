import { User as PrismaUser, NotificationPreferences } from "@/lib/generated/prisma/client";
import { proxy } from "valtio";

export type UserWithPreferences = PrismaUser & {
    notificationPreferences?: NotificationPreferences | null
}

export const useUserStore = proxy({
    user_token: null as string | null,
    user: null as UserWithPreferences | null,
    all_users: [] as UserWithPreferences[],
    superadmin: false as boolean
})