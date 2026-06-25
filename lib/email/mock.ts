import type { EmailSender, SendResult } from "./types";
import {
  passwordResetEmail,
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
}
