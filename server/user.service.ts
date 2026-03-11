import db from "@/lib/prisma";

export class UserService {
    static async getUser(userId: string) {
        return await db.user.findUnique({
            where: {
                id: userId
            }
        })
    }
}