
import { Resend } from 'resend';
import { getExpirationEmailHtml, getNewEmployeeEmailHtml } from './templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'notificacoes@etxgestao.com.br';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export class EmailService {
    static async sendExpirationAlert(data: {
        to: string;
        adminName: string;
        days: number;
        expiringItems: { employeeName: string; documentType: string; expiresAt: string }[];
    }) {
        const html = getExpirationEmailHtml({ ...data, baseUrl: BASE_URL });
        const subject = data.days === 0
            ? `⚠️ ALERTA: Documentos Vencendo HOJE`
            : `Vencimento de Documentos em ${data.days} dias`;

        return this.send(data.to, subject, html);
    }

    static async sendNewEmployeeNotification(data: {
        to: string;
        adminName: string;
        employeeName: string;
        position: string;
    }) {
        const html = getNewEmployeeEmailHtml({ ...data, baseUrl: BASE_URL });
        const subject = `Novo Funcionário: ${data.employeeName}`;

        return this.send(data.to, subject, html);
    }

    private static async send(to: string, subject: string, html: string) {
        try {
            const { data, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: [to],
                subject,
                html,
            });

            if (error) {
                console.error('Email send error:', error);
                return { success: false, error };
            }

            return { success: true, data };
        } catch (err) {
            console.error('Email service catch:', err);
            return { success: false, error: err };
        }
    }
}
