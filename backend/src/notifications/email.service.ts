import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Send transactional email notification.
   * If RESEND_API_KEY or SMTP is provided in env, dispatches via provider,
   * otherwise logs email dispatch for development environment.
   */
  async sendEmail(payload: SendEmailPayload): Promise<boolean> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        // Provider integration (e.g. Resend API call)
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'RideFlow AI <notifications@rideflow.ai>',
            to: payload.to,
            subject: payload.subject,
            text: payload.body,
            html: payload.html || `<p>${payload.body}</p>`,
          }),
        });

        if (!response.ok) {
          this.logger.error(`Resend API returned status ${response.status}`);
          return false;
        }
        this.logger.log(`Email sent successfully to ${payload.to} via Resend`);
        return true;
      }

      // Development / test fallback logger
      this.logger.log(
        `[EmailService Mock] Dispatching email to ${payload.to} | Subject: "${payload.subject}"`,
      );
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${payload.to}: ${err}`);
      return false;
    }
  }
}
