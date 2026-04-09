
import { checkAndSendExpirationAlerts } from "@/lib/emails/expiration-checker";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await checkAndSendExpirationAlerts();

        return NextResponse.json({ success: true, message: "Alertas de vencimento processados" });
    } catch (error: any) {
        console.error("CRON ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}
