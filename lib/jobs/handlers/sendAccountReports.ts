import { prisma } from "@/lib/db";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { isAfterSendHour, zonedParts } from "@/lib/notifications/schedule";
import { NotificationKind } from "@/lib/enums";
import { buildAccountReportDigest } from "@/services/reports/report-digest";
import type { JobPayloads } from "../types";

/**
 * Email the account holder a monthly portfolio report. Runs hourly and self-gates
 * per account on the local calendar: it delivers once, on the **1st of the month**
 * at/after the account-local send hour. Routed through the central dispatcher so
 * it respects the account's "Monthly summary" preference + email channel, is
 * deduped per month, and is delivered via whatever transport is configured —
 * Resend when EMAIL_DRIVER=resend / RESEND_API_KEY is set.
 *
 * `force` (manual single-account run) bypasses the day/hour gate for testing.
 */
export async function sendAccountReports(
  data: JobPayloads["sendAccountReports"],
) {
  const now = new Date();
  const accounts = await prisma.account.findMany({
    where: data.entityId ? { id: data.entityId } : {},
    select: { id: true, timeZone: true },
  });

  let sent = 0;
  for (const account of accounts) {
    const parts = zonedParts(now, account.timeZone);
    if (!data.force) {
      if (parts.day !== 1) continue;
      if (!isAfterSendHour(now, account.timeZone)) continue;
    }

    const ym = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    const digest = await buildAccountReportDigest(account.id, now);
    const heading = `Your ${digest.periodLabel} portfolio report`;

    const result = await dispatchNotification({
      accountId: account.id,
      category: NotificationCategory.monthlySummary,
      kind: NotificationKind.MONTHLY_REPORT,
      title: heading,
      body: digest.metrics.map((m) => `${m.label}: ${m.value}`).join(" · "),
      href: "/reports",
      emailSubject: `PropManage report — ${digest.periodLabel}`,
      // One report per account per calendar month (force runs skip the ledger).
      dedupKey: data.force ? undefined : `report:monthly:${account.id}:${ym}`,
      report: {
        heading,
        periodLabel: digest.periodLabel,
        intro: "Here's how your portfolio is tracking this month.",
        metrics: digest.metrics,
        notes: digest.notes,
      },
    });
    if (result.channels.length > 0) sent++;
  }

  console.log(
    `[jobs] sendAccountReports: ${accounts.length} account(s), ${sent} sent`,
  );
}
