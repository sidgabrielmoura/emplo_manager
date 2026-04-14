import { Resend } from 'resend';
import { getServerUserId, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { data, error } = await resend.emails.send({
            from: 'ETX Gestão <onboarding@resend.dev>',
            to: ['sidgabrielmoura40@gmail.com'],
            subject: 'Hello world',
            html: '<h1>Welcome, John!</h1><p>This is a test email from your local environment.</p>',
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message || error }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Email route catch block:', error);
        return NextResponse.json({ error: error.message || error }, { status: 500 });
    }
}