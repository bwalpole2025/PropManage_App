// Pure email templates — trivially unit-testable.

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function verificationEmail(input: {
  name?: string | null;
  verifyUrl: string;
}): RenderedEmail {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  return {
    subject: "Verify your PropManage email",
    text: `${greeting}\n\nConfirm your email address to finish setting up PropManage:\n${input.verifyUrl}\n\nIf you didn't create an account, you can ignore this email.`,
    html: `<p>${greeting}</p><p>Confirm your email address to finish setting up PropManage:</p><p><a href="${input.verifyUrl}">Verify email</a></p>`,
  };
}

export function operationalAlertEmail(input: {
  name?: string | null;
  subject: string;
  heading: string;
  body: string;
  href?: string | null;
}): RenderedEmail {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const link = input.href ? `\n\nView in PropManage: ${input.href}` : "";
  const linkHtml = input.href
    ? `<p><a href="${input.href}">View in PropManage</a></p>`
    : "";
  return {
    subject: input.subject,
    text: `${greeting}\n\n${input.body}${link}`,
    html: `<p>${greeting}</p><p><strong>${input.heading}</strong></p><p>${input.body}</p>${linkHtml}`,
  };
}

/** Minimal HTML-escape for user-supplied values interpolated into email HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ComplianceAlertFields {
  name?: string | null;
  subject: string;
  /** Escalation heading, e.g. "Final warning — action required". */
  tierLabel: string;
  /** RAG drives the accent colour. */
  rag: "RED" | "AMBER" | "GREEN";
  itemLabel: string;
  propertyLabel: string;
  /** e.g. "Expires 2026-09-01 (in 7 days)" or "Overdue by 3 days". */
  deadlineText: string;
  penalty: string;
  href?: string | null;
}

const RAG_ACCENT: Record<ComplianceAlertFields["rag"], string> = {
  RED: "#b91c1c",
  AMBER: "#b45309",
  GREEN: "#15803d",
};
const RAG_TINT: Record<ComplianceAlertFields["rag"], string> = {
  RED: "#fef2f2",
  AMBER: "#fffbeb",
  GREEN: "#f0fdf4",
};

/**
 * A responsive (max-width 600px, inline-styled) compliance alert email. States
 * the property, the failing item, the deadline and the potential penalty, with a
 * RAG-coloured header and a CTA into the dashboard.
 */
export function complianceAlertEmail(input: ComplianceAlertFields): RenderedEmail {
  const greeting = input.name ? `Hi ${esc(input.name)},` : "Hi,";
  const accent = RAG_ACCENT[input.rag];
  const tint = RAG_TINT[input.rag];
  const href = input.href ?? null;

  const text =
    `${input.name ? `Hi ${input.name},` : "Hi,"}\n\n` +
    `${input.tierLabel}\n\n` +
    `Property: ${input.propertyLabel}\n` +
    `Compliance item: ${input.itemLabel}\n` +
    `Deadline: ${input.deadlineText}\n\n` +
    `Potential penalty: ${input.penalty}\n` +
    (href ? `\nReview in PropManage: ${href}\n` : "");

  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:6px 0;color:#71717a;font-size:13px;width:140px;vertical-align:top">${label}</td>
       <td style="padding:6px 0;color:#18181b;font-size:14px;font-weight:600">${value}</td>
     </tr>`;

  const button = href
    ? `<tr><td style="padding:20px 24px 4px">
         <a href="${esc(href)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px">Review compliance &rarr;</a>
       </td></tr>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
        <tr><td style="background:${accent};padding:16px 24px;color:#ffffff;font-weight:700;font-size:16px">${esc(input.tierLabel)}</td></tr>
        <tr><td style="padding:22px 24px 6px;font-size:14px;line-height:1.5">${greeting}</td></tr>
        <tr><td style="padding:6px 24px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row("Property", esc(input.propertyLabel))}
            ${row("Compliance item", esc(input.itemLabel))}
            ${row("Deadline", esc(input.deadlineText))}
          </table>
        </td></tr>
        <tr><td style="padding:16px 24px 0">
          <div style="background:${tint};border-left:4px solid ${accent};border-radius:6px;padding:12px 14px;font-size:13px;line-height:1.55;color:#3f3f46">
            <strong style="color:${accent}">Potential penalty</strong><br>${esc(input.penalty)}
          </div>
        </td></tr>
        ${button}
        <tr><td style="padding:20px 24px;color:#a1a1aa;font-size:12px;line-height:1.5">You're receiving this because compliance alerts are enabled for your PropManage account. This is general information, not legal advice.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: input.subject, text, html };
}

export interface ReportEmailFields {
  name?: string | null;
  subject: string;
  /** e.g. "Your June 2026 portfolio report". */
  heading: string;
  /** e.g. "June 2026" or "Tax year 2026-27". */
  periodLabel: string;
  intro?: string;
  /** Label/value rows, e.g. { label: "Net income", value: "£1,250.00" }. */
  metrics: { label: string; value: string }[];
  /** Optional highlight bullets (e.g. compliance call-outs). */
  notes?: string[];
  href?: string | null;
}

/**
 * A responsive (max-width 600px, inline-styled) report digest email — a period
 * heading, a metrics table and optional highlight notes, with a CTA into the
 * reports area. Used for the monthly account-holder report.
 */
export function reportEmail(input: ReportEmailFields): RenderedEmail {
  const greeting = input.name ? `Hi ${esc(input.name)},` : "Hi,";
  const href = input.href ?? null;

  const text =
    `${input.name ? `Hi ${input.name},` : "Hi,"}\n\n` +
    `${input.heading} (${input.periodLabel})\n\n` +
    (input.intro ? `${input.intro}\n\n` : "") +
    input.metrics.map((m) => `${m.label}: ${m.value}`).join("\n") +
    (input.notes && input.notes.length
      ? `\n\n${input.notes.map((n) => `- ${n}`).join("\n")}`
      : "") +
    (href ? `\n\nView your reports: ${href}\n` : "");

  const rows = input.metrics
    .map(
      (m) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#475569;font-size:14px">${esc(m.label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:15px;font-weight:700;text-align:right">${esc(m.value)}</td>
      </tr>`,
    )
    .join("");

  const notes =
    input.notes && input.notes.length
      ? `<tr><td style="padding:16px 24px 0">
          <div style="background:#f8fafc;border-left:4px solid #4f46e5;border-radius:6px;padding:12px 14px">
            ${input.notes
              .map(
                (n) =>
                  `<p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#334155">${esc(n)}</p>`,
              )
              .join("")}
          </div></td></tr>`
      : "";

  const button = href
    ? `<tr><td style="padding:20px 24px 4px">
         <a href="${esc(href)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px">View full reports &rarr;</a>
       </td></tr>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#0f172a;padding:20px 24px;color:#ffffff">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">${esc(input.periodLabel)}</div>
          <div style="margin-top:4px;font-size:18px;font-weight:700">${esc(input.heading)}</div>
        </td></tr>
        <tr><td style="padding:22px 24px 6px;font-size:14px;line-height:1.5">${greeting}</td></tr>
        ${input.intro ? `<tr><td style="padding:0 24px 6px;font-size:14px;line-height:1.5;color:#475569">${esc(input.intro)}</td></tr>` : ""}
        <tr><td style="padding:8px 24px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>
        </td></tr>
        ${notes}
        ${button}
        <tr><td style="padding:20px 24px;color:#94a3b8;font-size:12px;line-height:1.5">You're receiving this because monthly summaries are enabled for your PropManage account. Figures are estimates for guidance, not a tax return.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: input.subject, text, html };
}

export function passwordResetEmail(input: {
  name?: string | null;
  resetUrl: string;
}): RenderedEmail {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  return {
    subject: "Reset your PropManage password",
    text: `${greeting}\n\nReset your password using the link below (valid for 1 hour):\n${input.resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>${greeting}</p><p>Reset your password using the link below (valid for 1 hour):</p><p><a href="${input.resetUrl}">Reset password</a></p>`,
  };
}
