// Env-based email factory, mirroring lib/services. Defaults to the mock sender
// (console + in-memory outbox) so local dev and tests need no SMTP server.

import { MockEmailSender } from "./mock";
import { SmtpEmailSender } from "./smtp";
import type { EmailSender } from "./types";

function makeSender(): EmailSender {
  const driver =
    process.env.EMAIL_DRIVER ??
    (process.env.NODE_ENV === "production" ? "smtp" : "mock");
  if (driver === "smtp") return new SmtpEmailSender();
  return new MockEmailSender();
}

export const emailSender: EmailSender = makeSender();
export { getOutbox, clearOutbox } from "./mock";
export type { EmailSender } from "./types";
