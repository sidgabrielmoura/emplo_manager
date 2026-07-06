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

    if (!token) {
        token = req.cookies.get("spy_access_token")?.value;
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
    // 1. Priority: check admin tokens first (super_auth_token then auth_token)
    //    If either resolves to a valid user, ignore the spy cookie completely.
    const adminToken =
        req.cookies.get("super_auth_token")?.value ||
        req.cookies.get("auth_token")?.value;

    if (adminToken) {
        try {
            const decoded = jwt.verify(adminToken, process.env.JWT_SECRET!) as TokenPayload;
            const userId = decoded.sub;

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
                return { ...superadmin, role: "SUPERADMIN" };
            }
        } catch {
            // Invalid admin token — fall through to spy check below
        }
    }

    // 2. Only check spy token when no valid admin session exists
    const spyToken = req.cookies.get("spy_access_token")?.value;
    if (spyToken) {
        try {
            const decoded = jwt.verify(spyToken, process.env.JWT_SECRET!) as any;
            const spySession = await db.spySession.findUnique({
                where: { id: decoded.sessionId || "" },
                include: { spyAccess: true }
            });

            if (spySession && spySession.status === "ACTIVE" && spySession.spyAccess.status === "ACTIVE") {
                if (new Date(spySession.spyAccess.expiresAt) > new Date()) {
                    await db.spySession.update({
                        where: { id: spySession.id },
                        data: { lastActiveAt: new Date() }
                    }).catch(console.error);

                    return {
                        id: spySession.spyAccess.id,
                        name: spySession.spyAccess.name,
                        email: spySession.spyAccess.email,
                        role: "ESPIAO" as const,
                        companyId: spySession.spyAccess.companyId,
                        permissions: spySession.spyAccess.permissions,
                        costCenters: spySession.spyAccess.costCenters,
                        spySessionId: spySession.id
                    };
                } else {
                    // Mark as expired
                    await db.spyAccess.update({
                        where: { id: spySession.spyAccessId },
                        data: { status: "EXPIRED" }
                    }).catch(console.error);
                    await db.spySession.update({
                        where: { id: spySession.id },
                        data: { status: "EXPIRED" }
                    }).catch(console.error);
                }
            }
        } catch (e) {
            console.error("Spy auth verification failed:", e);
        }
    }

    return null;
}

export async function validateCompanyAccess(userId: string, companyId: string) {
    const sa = await db.superadmin.findUnique({ where: { id: userId } });
    if (sa) return true;

    // Check if Spy
    const spy = await db.spyAccess.findUnique({
        where: { id: userId },
        select: { companyId: true, status: true }
    });
    if (spy) {
        if (spy.status !== "ACTIVE") return false;
        return spy.companyId === companyId;
    }

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
