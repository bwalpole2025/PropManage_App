import type { EmailSender, SendResult } from "./types";
import {
  complianceAlertEmail,
  operationalAlertEmail,
  passwordResetEmail,
  reportEmail,
  verificationEmail,
  type RenderedEmail,
} from "./templates";

export interface OutboxEntry extends RenderedEmail {
  id: string;
  to: string;
  link: string;
  sentAt: string;
}

// Module-scoped dev outbox. Tests assert against this (e.g. grab the reset link).
const outbox: OutboxEntry[] = [];
export function getOutbox(): readonly OutboxEntry[] {
  return outbox;
}
export function clearOutbox(): void {
  outbox.length = 0;
}

let counter = 1;

function record(to: string, link: string, email: RenderedEmail): SendResult {
  const id = `mock-email-${counter++}`;
  outbox.push({ id, to, link, sentAt: new Date().toISOString(), ...email });
  console.log(`\n[email:mock] → ${to}: ${email.subject}\n  ${link}\n`);
  return { id };
}

export class MockEmailSender implements EmailSender {
  readonly driver = "mock";

  async sendVerificationEmail(input: {
    to: string;
    name?: string | null;
    verifyUrl: string;
  }): Promise<SendResult> {
    return record(
      input.to,
      input.verifyUrl,
      verificationEmail({ name: input.name, verifyUrl: input.verifyUrl }),
    );
  }

  async sendPasswordResetEmail(input: {
    to: string;
    name?: string | null;
    resetUrl: string;
  }): Promise<SendResult> {
    return record(
      input.to,
      input.resetUrl,
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
    return record(
      input.to,
      input.href ?? "",
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
    return record(input.to, input.href ?? "", complianceAlertEmail(input));
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
    return record(input.to, input.href ?? "", reportEmail(input));
  }
}
