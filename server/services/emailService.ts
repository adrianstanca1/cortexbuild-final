import { logger } from '../utils/logger.js';
import sgMail from '@sendgrid/mail';

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
    templateId?: string;
    dynamicTemplateData?: any;
}

class EmailService {
    private isConfigured: boolean = false;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        const apiKey = process.env.SENDGRID_API_KEY;
        const fromEmail = process.env.EMAIL_FROM;

        if (apiKey) {
            sgMail.setApiKey(apiKey);
            this.isConfigured = true;
            logger.info('EmailService: SendGrid API Key configured');
        } else {
            logger.error('EmailService: SENDGRID_API_KEY is missing. Real emails will NOT be sent.');
        }

        if (!fromEmail && this.isConfigured) {
            logger.warn('EmailService: EMAIL_FROM is missing. Emails may fail if using unverified senders.');
        }
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        const { to, subject, text, html, templateId, dynamicTemplateData } = options;

        if (!this.isConfigured) {
            logger.info(`[MOCK EMAIL SERVICE] To: ${to} | Subject: ${subject}`);
            logger.info(`[MOCK EMAIL BODY] ${text}`);
            if (templateId) logger.info(`[MOCK EMAIL TEMPLATE] ID: ${templateId}`);
            return true;
        }

        try {
            const from = process.env.EMAIL_FROM || 'noreply@cortexbuildpro.com';

            const msg: any = {
                to,
                from,
                subject,
            };

            // Use SendGrid Dynamic Template if provided
            if (templateId) {
                msg.templateId = templateId;
                msg.dynamicTemplateData = dynamicTemplateData || {};
            } else {
                msg.text = text;
                msg.html = html || text.replace(/\n/g, '<br/>');
            }

            logger.debug(`Sending email to ${to} from ${from}${templateId ? ` (template: ${templateId})` : ''}...`);
            await sgMail.send(msg);
            logger.info(`Email successfully sent to ${to}`);
            return true;
        } catch (error: any) {
            const details = error.response?.body?.errors || error.message;
            logger.error('EmailService: Failed to send email via SendGrid', {
                to,
                error: details,
                stack: error.stack
            });
            return false;
        }
    }

    async sendInvitation(to: string, role: string, companyName: string, inviteLink: string) {
        const templateId = process.env.SENDGRID_TEMPLATE_INVITATION;

        if (templateId) {
            return this.sendEmail({
                to,
                subject: `You've been invited to join ${companyName}`,
                text: `Accept your invitation: ${inviteLink}`,
                templateId,
                dynamicTemplateData: {
                    role,
                    company_name: companyName,
                    invite_link: inviteLink,
                    subject: `You've been invited to join ${companyName} on CortexBuild Pro`
                }
            });
        }

        // Fallback HTML
        const subject = `You've been invited to join ${companyName} on CortexBuild Pro`;
        const text = `
            Hello,

            You have been invited to join ${companyName} as a ${role}.
            
            Click the link below to accept your invitation:
            ${inviteLink}

            If you did not expect this invitation, please ignore this email.
        `;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to CortexBuild Pro</h2>
                <p>Hello,</p>
                <p>You have been invited to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
                <br/>
                <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
                <br/><br/>
                <p>If the button doesn't work, copy and paste this link:</p>
                <p>${inviteLink}</p>
            </div>
        `;

        return this.sendEmail({ to, subject, text, html });
    }

    async sendCompanyOwnerActivation(
        to: string,
        ownerName: string,
        companyName: string,
        companyDetails: {
            plan: string;
            storageQuota: number;
            region: string;
        },
        activationLink: string
    ) {
        const templateId = process.env.SENDGRID_TEMPLATE_ACTIVATION;

        if (templateId) {
            return this.sendEmail({
                to,
                subject: `Activate Your Company: ${companyName}`,
                text: `Welcome ${ownerName}! Activate your company: ${activationLink}`,
                templateId,
                dynamicTemplateData: {
                    owner_name: ownerName,
                    company_name: companyName,
                    plan: companyDetails.plan,
                    storage_quota: companyDetails.storageQuota,
                    region: companyDetails.region,
                    activation_link: activationLink,
                    subject: `Activate Your Company: ${companyName} - CortexBuild Pro`
                }
            });
        }

        const subject = `Activate Your Company: ${companyName} - CortexBuild Pro`;

        // Try to read HTML template file
        const fs = await import('fs/promises');
        const path = await import('path');
        const __dirname = path.dirname(new URL(import.meta.url).pathname);

        let html: string;
        try {
            const templatePath = path.join(__dirname, '../templates/company_activation_email.html');
            html = await fs.readFile(templatePath, 'utf-8');

            html = html
                .replace(/{{ownerName}}/g, ownerName)
                .replace(/{{companyName}}/g, companyName)
                .replace(/{{plan}}/g, companyDetails.plan)
                .replace(/{{storageQuota}}/g, companyDetails.storageQuota.toString())
                .replace(/{{region}}/g, companyDetails.region)
                .replace(/{{activationLink}}/g, activationLink);
        } catch (error) {
            logger.warn('Company activation email template not found, using fallback HTML');
            html = this.getCompanyActivationFallbackHtml(ownerName, companyName, companyDetails, activationLink);
        }

        const text = `
Welcome ${ownerName}! 

Congratulations! A new company has been created for you on CortexBuild Pro. You've been designated as the Company Owner with full administrative control.

Company Details:
- Company Name: ${companyName}
- Plan: ${companyDetails.plan}
- Storage: ${companyDetails.storageQuota} GB
- Region: ${companyDetails.region}

To activate your company and get started, please click the link below to set your password and complete the setup process:

${activationLink}

This activation link will expire in 7 days for security purposes.

Need help? Contact us at support@cortexbuildpro.com

© 2025 CortexBuild Pro. All rights reserved.
        `.trim();

        return this.sendEmail({ to, subject, text, html });
    }

    private getCompanyActivationFallbackHtml(
        ownerName: string,
        companyName: string,
        companyDetails: { plan: string; storageQuota: number; region: string },
        activationLink: string
    ): string {
        return `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #0f5c82 0%, #1e88e5 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🏗️ CortexBuild Pro</h1>
                    <p style="margin: 10px 0 0 0; color: #e0f2fe; font-size: 16px;">Your Company is Ready to Launch</p>
                </div>
                <div style="padding: 40px 30px;">
                    <h2 style="color: #0f5c82; font-size: 24px;">Welcome, ${ownerName}! 👋</h2>
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                        Congratulations! A new company has been created for you on <strong>CortexBuild Pro</strong>. 
                        You've been designated as the <strong>Company Owner</strong> with full administrative control.
                    </p>
                    <div style="margin: 24px 0; background-color: #f4f4f5; border-radius: 8px; border-left: 4px solid #0f5c82; padding: 20px;">
                        <h3 style="margin: 0 0 12px 0; color: #18181b; font-size: 18px;">📋 Company Details</h3>
                        <p style="margin: 6px 0; color: #18181b;"><strong>Company:</strong> ${companyName}</p>
                        <p style="margin: 6px 0; color: #18181b;"><strong>Plan:</strong> ${companyDetails.plan}</p>
                        <p style="margin: 6px 0; color: #18181b;"><strong>Storage:</strong> ${companyDetails.storageQuota} GB</p>
                        <p style="margin: 6px 0; color: #18181b;"><strong>Region:</strong> ${companyDetails.region}</p>
                    </div>
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                        To activate your company and get started, please click the button below to set your password.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${activationLink}" style="display: inline-block; background-color: #0f5c82; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            🚀 Activate Company & Set Password
                        </a>
                    </div>
                    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 13px;">
                        If the button doesn't work, copy and paste this link:<br/>
                        <a href="${activationLink}" style="color: #0f5c82;">${activationLink}</a>
                    </p>
                </div>
            </div>
        `;
    }

    async sendPasswordResetEmail(to: string, name: string, resetToken: string) {
        const templateId = process.env.SENDGRID_TEMPLATE_PASSWORD_RESET;

        if (templateId) {
            const resetLink = `${process.env.APP_URL || 'https://cortexbuildpro.com'}/reset-password?token=${resetToken}`;
            return this.sendEmail({
                to,
                subject: 'Reset your CortexBuild Pro password',
                text: `Reset your password: ${resetLink}`,
                templateId,
                dynamicTemplateData: {
                    name,
                    reset_link: resetLink,
                    subject: 'Reset your CortexBuild Pro password'
                }
            });
        }

        const subject = 'Reset your CortexBuild Pro password';
        const resetLink = `${process.env.APP_URL || 'https://cortexbuildpro.com'}/reset-password?token=${resetToken}`;

        const text = `
            Hello ${name},

            We received a request to reset your password for your CortexBuild Pro account.
            
            Click the link below to reset your password:
            ${resetLink}

            This link will expire in 24 hours.

            If you did not request a password reset, please ignore this email.
        `;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hello ${name},</p>
                <p>We received a request to reset your password for your CortexBuild Pro account.</p>
                <br/>
                <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
                <br/><br/>
                <p>If the button doesn't work, copy and paste this link:</p>
                <p>${resetLink}</p>
                <p>This link will expire in 24 hours.</p>
                <br/>
                <p>If you did not request a password reset, please ignore this email.</p>
            </div>
        `;

        return this.sendEmail({ to, subject, text, html });
    }
}

export const emailService = new EmailService();
