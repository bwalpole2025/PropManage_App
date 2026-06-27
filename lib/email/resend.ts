import type { EmailSender, SendResult } from "./types";
import {
  complianceAlertEmail,
  operationalAlertEmail,
  passwordResetEmail,
  reportEmail,
  verificationEmail,
} from "./templates";

// Resend transport (EMAIL_DRIVER=resend, or auto-selected when RESEND_API_KEY is
// set). Talks to the Resend REST API directly with fetch — no SDK dependency —
// and reuses the same pure templates as the mock/SMTP senders, so every existing
// reminder and report email is delivered through Resend unchanged.
//
// Required env:
//   RESEND_API_KEY   — your Resend API key (https://resend.com/api-keys)
//   EMAIL_FROM       — a verified sender, e.g. "PropManage <reports@yourdomain.com>"

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export class ResendEmailSender implements EmailSender {
  readonly driver = "resend";
  private from =
    process.env.EMAIL_FROM ?? "PropManage <no-reply@propmanage.local>";
  private apiKey = process.env.RESEND_API_KEY ?? "";

  private async send(
    to: string,
    email: { subject: string; text: string; html: string },
  ): Promise<SendResult> {
    if (!this.apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set — cannot send email via the Resend driver.",
      );
    }
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Resend send failed (${res.status} ${res.statusText}): ${detail.slice(0, 300)}`,
      );
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: data.id ?? "resend-unknown" };
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
    return this.send(input.to, operationalAlertEmail(input));
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
