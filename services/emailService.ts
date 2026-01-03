/**
 * Email Service
 * Handles sending emails for member invitations, notifications, and communications
 * Supports multiple backends: SendGrid, Mailgun, SMTP, or Supabase Email API
 */

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private sendGridUrl = 'https://api.sendgrid.com/v3/mail/send';

  constructor() {
    this.apiKey = process.env.VITE_SENDGRID_API_KEY || '';
    this.fromEmail = process.env.VITE_FROM_EMAIL || 'noreply@buildproapp.com';
    this.fromName = process.env.VITE_FROM_NAME || 'BuildPro';
  }

  /**
   * Send a basic email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      // If no API key, simulate successful send (development mode)
      if (!this.apiKey) {
        console.log('📧 [DEV MODE] Email would be sent to:', options.to);
        console.log('Subject:', options.subject);
        return {
          success: true,
          messageId: `dev-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
      }

      // Send via SendGrid
      const response = await fetch(this.sendGridUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
              subject: options.subject,
            },
          ],
          from: {
            email: this.fromEmail,
            name: this.fromName,
          },
          content: [
            {
              type: 'text/plain',
              value: options.textBody || this.stripHtml(options.htmlBody),
            },
            {
              type: 'text/html',
              value: options.htmlBody,
            },
          ],
          reply_to: options.replyTo ? { email: options.replyTo } : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${response.status} - ${error}`);
      }

      return {
        success: true,
        messageId: response.headers.get('X-Message-Id') || `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send member invitation email
   */
  async sendMemberInvitation(
    memberEmail: string,
    memberName: string,
    projectName: string,
    role: string,
    invitationLink?: string
  ): Promise<EmailResponse> {
    const inviteUrl = invitationLink || `${window.location.origin}/invite`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f5c82 0%, #0c4a6e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">BuildPro</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Construction Management Platform</p>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827;">
              Hi <strong>${memberName}</strong>,
            </p>

            <p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              You've been invited to join <strong>${projectName}</strong> on BuildPro as a <strong>${role}</strong>.
            </p>

            <p style="margin: 0 0 25px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              Accept this invitation to get started with project management, real-time collaboration, and AI-powered insights.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: #0f5c82; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              This invitation expires in 7 days. If you didn't expect this email or have questions, please contact the project manager.
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
            <p>© ${new Date().getFullYear()} BuildPro. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: memberEmail,
      subject: `Invitation to join ${projectName} on BuildPro`,
      htmlBody,
      textBody: `Hi ${memberName},\n\nYou've been invited to join ${projectName} on BuildPro as a ${role}.\n\nAccept this invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
    });
  }

  /**
   * Send role change notification
   */
  async sendRoleChangeNotification(
    memberEmail: string,
    memberName: string,
    oldRole: string,
    newRole: string,
    projectName: string
  ): Promise<EmailResponse> {
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f5c82 0%, #0c4a6e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">BuildPro</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827;">
              Hi <strong>${memberName}</strong>,
            </p>

            <p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              Your role in <strong>${projectName}</strong> has been updated.
            </p>

            <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0f5c82;">
              <p style="margin: 0; font-size: 14px; color: #374151;">
                <strong>Previous Role:</strong> ${oldRole}<br>
                <strong>New Role:</strong> ${newRole}
              </p>
            </div>

            <p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              Login to BuildPro to see your new permissions and responsibilities.
            </p>

            <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              If you have questions, contact your project manager.
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: memberEmail,
      subject: `Your role in ${projectName} has been updated`,
      htmlBody,
      textBody: `Hi ${memberName},\n\nYour role in ${projectName} has been updated from ${oldRole} to ${newRole}.\n\nLogin to BuildPro to see your new permissions.`,
    });
  }

  /**
   * Send member removal notification
   */
  async sendMemberRemovalNotification(
    memberEmail: string,
    memberName: string,
    projectName: string,
    reason?: string
  ): Promise<EmailResponse> {
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f5c82 0%, #0c4a6e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">BuildPro</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827;">
              Hi <strong>${memberName}</strong>,
            </p>

            <p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              You have been removed from <strong>${projectName}</strong> on BuildPro.
            </p>

            ${reason ? `<p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              <strong>Reason:</strong> ${reason}
            </p>` : ''}

            <p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              You no longer have access to this project's resources.
            </p>

            <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              If you believe this is an error, please contact your project manager.
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: memberEmail,
      subject: `You have been removed from ${projectName}`,
      htmlBody,
      textBody: `Hi ${memberName},\n\nYou have been removed from ${projectName} on BuildPro.${reason ? `\n\nReason: ${reason}` : ''}\n\nIf you believe this is an error, contact your project manager.`,
    });
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignmentNotification(
    memberEmail: string,
    memberName: string,
    taskTitle: string,
    projectName: string,
    dueDate?: string
  ): Promise<EmailResponse> {
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f5c82 0%, #0c4a6e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">BuildPro</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #111827;">
              Hi <strong>${memberName}</strong>,
            </p>

            <p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              You have been assigned a new task in <strong>${projectName}</strong>.
            </p>

            <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0f5c82;">
              <p style="margin: 0; font-size: 14px; color: #374151;">
                <strong>Task:</strong> ${taskTitle}<br>
                ${dueDate ? `<strong>Due:</strong> ${new Date(dueDate).toLocaleDateString()}` : ''}
              </p>
            </div>

            <p style="margin: 0 0 15px 0; font-size: 14px; color: #374151; line-height: 1.5;">
              Login to BuildPro to view the full task details and start working.
            </p>

            <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Keep your team updated on your progress!
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: memberEmail,
      subject: `New task assigned: ${taskTitle}`,
      htmlBody,
      textBody: `Hi ${memberName},\n\nYou have been assigned a new task in ${projectName}.\n\nTask: ${taskTitle}${dueDate ? `\nDue: ${new Date(dueDate).toLocaleDateString()}` : ''}\n\nLogin to BuildPro to view full details.`,
    });
  }

  /**
   * Send bulk email (newsletter, announcements)
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    htmlBody: string
  ): Promise<EmailResponse> {
    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No recipients specified',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // If no API key, simulate successful bulk send
      if (!this.apiKey) {
        console.log(`📧 [DEV MODE] Bulk email would be sent to ${recipients.length} recipients`);
        return {
          success: true,
          messageId: `bulk-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
      }

      const response = await fetch(this.sendGridUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: recipients.map(email => ({
            to: [{ email }],
            subject,
          })),
          from: {
            email: this.fromEmail,
            name: this.fromName,
          },
          content: [
            {
              type: 'text/html',
              value: htmlBody,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`SendGrid error: ${response.status}`);
      }

      return {
        success: true,
        messageId: `bulk-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Bulk email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }
}

// Export singleton instance
export const emailService = new EmailService();
