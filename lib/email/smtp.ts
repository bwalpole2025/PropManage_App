import type { EmailSender, SendResult } from "./types";
import {
  complianceAlertEmail,
  operationalAlertEmail,
  passwordResetEmail,
  reportEmail,
  verificationEmail,
} from "./templates";

// Real SMTP sender (EMAIL_DRIVER=smtp). nodemailer is imported lazily so the
// default mock path never loads it.
export class SmtpEmailSender implements EmailSender {
  readonly driver = "smtp";
  private from = process.env.EMAIL_FROM ?? "PropManage <no-reply@propmanage.local>";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transportPromise: Promise<any> | null = null;
  private transport() {
    if (!this.transportPromise) {
      this.transportPromise = (async () => {
        const nodemailer = await import("nodemailer");
        return nodemailer.createTransport(process.env.SMTP_URL);
      })();
    }
    return this.transportPromise;
  }

  private async send(
    to: string,
    email: { subject: string; text: string; html: string },
  ): Promise<SendResult> {
    const transport = await this.transport();
    const info = await transport.sendMail({ from: this.from, to, ...email });
    return { id: info.messageId };
  }

  async sendVerificationEmail(input: {
    to: string;
    name?: string | null;
    verifyUrl: string;
  }): Promise<SendResult> {
    return this.send(
      input.to,
      verificationEmail({ name: input.name, verifyUrl: input.verifyUrl }),
    );
  }

  async sendPasswordResetEmail(input: {
    to: string;
    name?: string | null;
    resetUrl: string;
  }): Promise<SendResult> {
    return this.send(
      input.to,
      passwordResetEmail({ name: input.name, resetUrl: input.resetUrl }),
    );
  }

  async sendOperationalAlert(input: {
    to: string;
    name?: string | null;
    subject: string;
    heading: string;
    body: string;
    href?: string | null;
  }): Promise<SendResult> {
    return this.send(
      input.to,
      operationalAlertEmail({
        name: input.name,
        subject: input.subject,
        heading: input.heading,
        body: input.body,
        href: input.href,
      }),
    );
  }

  async sendComplianceAlert(input: {
    to: string;
    name?: string | null;
    subject: string;
    tierLabel: string;
    rag: "RED" | "AMBER" | "GREEN";
    itemLabel: string;
    propertyLabel: string;
    deadlineText: string;
    penalty: string;
    href?: string | null;
  }): Promise<SendResult> {
    return this.send(input.to, complianceAlertEmail(input));
  }

  async sendReport(input: {
    to: string;
    name?: string | null;
    subject: string;
    heading: string;
    periodLabel: string;
    intro?: string;
    metrics: { label: string; value: string }[];
    notes?: string[];
    href?: string | null;
  }): Promise<SendResult> {
    return this.send(input.to, reportEmail(input));
  }
}
