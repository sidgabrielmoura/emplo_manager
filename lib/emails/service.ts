import { Resend } from 'resend';
import { getExpirationEmailHtml, getNewEmployeeEmailHtml, getImportCompletionEmailHtml, getWelcomeEmailHtml, getPassportEmissionEmailHtml } from './templates';
import db from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ETX Gestão <onboarding@xn--etxgesto-xza.com.br>';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export class EmailService {
    static async sendExpirationAlert(data: {
        to: string;
        recipientName?: string;
        adminName: string;
        days: number;
        expiringItems: { employeeName: string; documentType: string; expiresAt: string }[];
        companyId?: string;
    }) {
        const html = getExpirationEmailHtml({ ...data, baseUrl: BASE_URL });
        const subject = data.days === 0
            ? `⚠️ ALERTA: Documentos Vencendo HOJE`
            : `Vencimento de Documentos em ${data.days} dias`;

        return this.send({
            to: data.to,
            recipientName: data.recipientName || data.adminName,
            subject,
            html,
            companyId: data.companyId
        });
    }

    static async sendNewEmployeeNotification(data: {
        to: string;
        recipientName?: string;
        adminName: string;
        employeeName: string;
        position: string;
        companyId?: string;
    }) {
        const html = getNewEmployeeEmailHtml({ ...data, baseUrl: BASE_URL });
        const subject = `Novo Funcionário: ${data.employeeName}`;

        return this.send({
            to: data.to,
            recipientName: data.recipientName || data.adminName,
            subject,
            html,
            companyId: data.companyId
        });
    }

    static async sendImportCompletionNotification(data: {
        to: string;
        adminName: string;
        fileName: string;
        totalFound: number;
        totalCreated: number;
        totalFailed: number;
        companyId?: string;
    }) {
        const html = getImportCompletionEmailHtml({ ...data, baseUrl: BASE_URL });
        const subject = data.totalFailed > 0
            ? `⚠️ Importação Concluída com Erros (${data.totalFailed} falhas)`
            : `✅ Importação Concluída com Sucesso`;

        return this.send({
            to: data.to,
            recipientName: data.adminName,
            subject,
            html,
            companyId: data.companyId
        });
    }

    static async sendWelcomeEmail(data: {
        to: string;
        userName: string;
        tempPassword?: string;
        companyId?: string;
    }) {
        const html = getWelcomeEmailHtml({ ...data, baseUrl: BASE_URL });
        const subject = `Bem-vindo ao ETX Gestão`;

        return this.send({
            to: data.to,
            recipientName: data.userName,
            subject,
            html,
            companyId: data.companyId
        });
    }

    static async sendPassportEmissionNotification(data: {
        to: string;
        adminName: string;
        employeeName: string;
        companyId?: string;
    }) {
        const html = getPassportEmissionEmailHtml({ ...data, baseUrl: BASE_URL });
        const subject = `Passaporte de Segurança Emitido: ${data.employeeName}`;

        return this.send({
            to: data.to,
            recipientName: data.adminName,
            subject,
            html,
            companyId: data.companyId
        });
    }

    private static async send(data: {
        to: string;
        recipientName?: string;
        subject: string;
        html: string;
        companyId?: string;
    }) {
        let status = 'SUCCESS';
        let errorText: string | null = null;
        let result: any = null;

        try {
            const { data: resData, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: [data.to],
                subject: data.subject,
                html: data.html,
            });

            if (error) {
                console.error('Email send error:', error);
                status = 'FAILED';
                errorText = error.message || JSON.stringify(error);
            } else {
                result = resData;
            }
        } catch (err: any) {
            console.error('Email service catch:', err);
            status = 'FAILED';
            errorText = err?.message || String(err);
        }

        // Log to database
        try {
            await db.emailLog.create({
                data: {
                    companyId: data.companyId || null,
                    recipientEmail: data.to,
                    recipientName: data.recipientName || null,
                    subject: data.subject,
                    body: data.html,
                    status,
                    error: errorText,
                }
            });
        } catch (dbErr) {
            console.error('Failed to write email log:', dbErr);
        }

        return { success: status === 'SUCCESS', data: result, error: errorText };
    }
}
