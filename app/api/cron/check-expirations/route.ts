
import { checkAndSendExpirationAlerts } from "@/lib/emails/expiration-checker";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secretParam = searchParams.get('secret');
        const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        const customHeader = req.headers.get('x-cron-secret');
        const providedSecret = secretParam || authHeader || customHeader;

        if (process.env.CRON_SECRET && providedSecret !== process.env.CRON_SECRET) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const result = await checkAndSendExpirationAlerts();

        return NextResponse.json({
            success: true,
            message: "Alertas de vencimento processados com sucesso",
            data: result
        });
    } catch (error: any) {
        console.error("CRON ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}
