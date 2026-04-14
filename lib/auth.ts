import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import db from "@/lib/prisma";

export type TokenPayload = {
    sub: string;
    email: string;
    role: string;
    name: string;
};

export async function getServerUserId(req: NextRequest): Promise<string | null> {
    let token = req.cookies.get("super_auth_token")?.value;

    if (!token) {
        token = req.cookies.get("auth_token")?.value;
    }

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
        return decoded.sub;
    } catch {
        return null;
    }
}

export async function getSessionUser(req: NextRequest) {
    const userId = await getServerUserId(req);
    if (!userId) return null;

    const user = await db.user.findUnique({
        where: { id: userId },
        include: { notificationPreferences: true }
    });

    if (user) return user;

    const superadmin = await db.superadmin.findUnique({
        where: { id: userId },
        include: { notificationPreferences: true }
    });

    if (superadmin) {
        return {
            ...superadmin,
            role: "SUPERADMIN",
        };
    }

    return null;
}

export async function validateCompanyAccess(userId: string, companyId: string) {
    const sa = await db.superadmin.findUnique({ where: { id: userId } });
    if (sa) return true;

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true, companyId: true, company: { select: { status: true } } }
    });

    if (!user) return false;

    if (user.role === "SUPERADMIN") return true;

    if (user.companyId === companyId) {
        if (user.company?.status === "BLOCKED") return false;
        return true;
    }

    return false;
}

export async function isSuperAdmin(req: NextRequest) {
    const userId = await getServerUserId(req);
    if (!userId) return false;

    const superToken = req.cookies.get("super_auth_token")?.value;
    if (superToken) {
        try {
            const decoded = jwt.verify(superToken, process.env.JWT_SECRET!) as TokenPayload;
            const sa = await db.superadmin.findUnique({ where: { id: decoded.sub } });
            if (sa) return true;
        } catch { }
    }

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    return user?.role === "SUPERADMIN";
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: "Sessão expirada ou não autenticado" }, { status: 401 });
}

export function forbiddenResponse() {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
}
