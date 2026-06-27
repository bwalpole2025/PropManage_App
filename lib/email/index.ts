// Env-based email factory, mirroring lib/services. Defaults to the mock sender
// (console + in-memory outbox) so local dev and tests need no SMTP server.
//
// Driver resolution:
//   1. EMAIL_DRIVER ("resend" | "smtp" | "mock") wins if set.
//   2. else, if RESEND_API_KEY is present → "resend".
//   3. else → "smtp" in production, "mock" otherwise.

import { MockEmailSender } from "./mock";
import { SmtpEmailSender } from "./smtp";
import { ResendEmailSender } from "./resend";
import type { EmailSender } from "./types";

function resolveDriver(): string {
  if (process.env.EMAIL_DRIVER) return process.env.EMAIL_DRIVER;
  if (process.env.RESEND_API_KEY) return "resend";
  return process.env.NODE_ENV === "production" ? "smtp" : "mock";
}

function makeSender(): EmailSender {
  switch (resolveDriver()) {
    case "resend":
      return new ResendEmailSender();
    case "smtp":
      return new SmtpEmailSender();
    default:
      return new MockEmailSender();
  }
}

export const emailSender: EmailSender = makeSender();
export { getOutbox, clearOutbox } from "./mock";
export type { EmailSender } from "./types";
