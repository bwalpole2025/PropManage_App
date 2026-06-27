import { createElement } from "react";
import { Resend } from "resend";
import { BetaWelcomeEmail } from "./react/BetaWelcomeEmail";
import {
  ComplianceAlertEmail,
  type ComplianceAlertType,
} from "./react/ComplianceAlertEmail";

// Transactional email via the official Resend Node.js SDK.
//
// The SDK accepts a React element in `react` and renders it to HTML/text with
// @react-email/render under the hood, so the templates in ./react are the single
// source of truth for each email's markup.
//
// Required env:
//   RESEND_API_KEY  — your Resend API key (https://resend.com/api-keys)
// Optional env:
//   EMAIL_FROM      — verified sender; must be on the verified production domain
//   APP_URL         — absolute base used for CTA links
//   SUPPORT_EMAIL   — reply-to / bug-report address

export type { ComplianceAlertType };

export interface EmailSendResult {
  /** Resend message id, or "resend-unknown" if the API omitted one. */
  id: string;
}

/**
 * Verified production sending domain (configured in Resend). All transactional
 * mail must originate from this domain or Resend will reject it. `EMAIL_FROM`
 * may override the local-part / display name but should stay on this domain.
 */
const PRODUCTION_DOMAIN = "propmanage.app";
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? `PropManage <no-reply@${PRODUCTION_DOMAIN}>`;
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? `support@${PRODUCTION_DOMAIN}`;
const APP_URL =
  process.env.APP_URL ??
  process.env.NEXTAUTH_URL ??
  `https://app.${PRODUCTION_DOMAIN}`;

// Lazily-constructed singleton so importing this module never throws at load
// time when RESEND_API_KEY is absent (e.g. local dev on the mock driver).
let client: Resend | null = null;
function resend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set — cannot send transactional email via Resend.",
    );
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Welcomes a new beta tester: confirms their account is active, points them at
 * the dashboard, and explains how to report bugs.
 */
export async function sendBetaWelcomeEmail(
  email: string,
): Promise<EmailSendResult> {
  const { data, error } = await resend().emails.send({
    from: FROM_ADDRESS,
    to: [email],
    replyTo: SUPPORT_EMAIL,
    subject: "Welcome to the PropManage beta 🎉",
    react: createElement(BetaWelcomeEmail, {
      appUrl: APP_URL,
      supportEmail: SUPPORT_EMAIL,
    }),
  });

  if (error) {
    throw new Error(`Resend: failed to send beta welcome email — ${error.message}`);
  }
  return { id: data?.id ?? "resend-unknown" };
}

/**
 * Notifies a landlord that a compliance obligation for a property is coming due.
 * Used to exercise the core notification loop with simulated deadlines.
 */
export async function sendComplianceAlertEmail(
  email: string,
  propertyAddress: string,
  alertType: ComplianceAlertType,
): Promise<EmailSendResult> {
  const { data, error } = await resend().emails.send({
    from: FROM_ADDRESS,
    to: [email],
    replyTo: SUPPORT_EMAIL,
    subject: `Action needed: ${alertType} deadline approaching — ${propertyAddress}`,
    react: createElement(ComplianceAlertEmail, {
      propertyAddress,
      alertType,
      appUrl: APP_URL,
    }),
  });

  if (error) {
    throw new Error(
      `Resend: failed to send compliance alert email — ${error.message}`,
    );
  }
  return { id: data?.id ?? "resend-unknown" };
}
