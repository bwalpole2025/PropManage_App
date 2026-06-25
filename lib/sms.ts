// Mock SMS sender — mirrors lib/email/mock.ts. In dev the code is logged to the
// console and recorded in an in-memory outbox so tests/drives can read it back.
// A real driver (Twilio etc.) can branch on process.env.SMS_DRIVER later.

export interface SmsOutboxEntry {
  id: string;
  to: string;
  body: string;
  sentAt: string;
}

const outbox: SmsOutboxEntry[] = [];
export function getSmsOutbox(): readonly SmsOutboxEntry[] {
  return outbox;
}
export function clearSmsOutbox(): void {
  outbox.length = 0;
}

let counter = 1;

export async function sendSms(to: string, body: string): Promise<{ id: string }> {
  const id = `mock-sms-${counter++}`;
  outbox.push({ id, to, body, sentAt: new Date().toISOString() });
  console.log(`\n[sms:mock] → ${to}: ${body}\n`);
  return { id };
}

/** Convenience used by the mobile-verification action. */
export async function sendVerificationSms(to: string, code: string) {
  return sendSms(to, `Your PropManage verification code is ${code}`);
}
