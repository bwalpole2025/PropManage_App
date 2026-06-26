import { prisma } from "@/lib/db";
import { BankConnStatus, NotificationKind } from "@/lib/enums";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { isAfterSendHour } from "@/lib/notifications/schedule";
import {
  BANK_CONSENT_OFFSETS,
  MAX_REMINDER_OFFSET,
  selectDueReminders,
} from "@/lib/notifications/due";
import type { JobPayloads } from "../types";

const DAY = 86_400_000;

/**
 * Open-banking consent lasts ~90 days; once it lapses the feed stops silently.
 * This sweep warns the account at 14/7/1 days before an ACTIVE connection's
 * consent expires so they can re-authorise in time. (Connections whose consent
 * has *already* lapsed are flipped to EXPIRED by `pollBankFeed` /
 * `expireStaleConnections` — this handler is the proactive heads-up.) The dedup
 * key includes the expiry date, so re-authorising (a new expiry) earns a fresh
 * set of warnings.
 */
export async function sendBankConsentWarnings(
  data: JobPayloads["sendBankConsentWarnings"],
) {
  const now = new Date();
  const horizon = new Date(now.getTime() + (MAX_REMINDER_OFFSET + 1) * DAY);

  const connections = await prisma.bankConnection.findMany({
    where: {
      status: BankConnStatus.ACTIVE,
      expiresAt: { not: null, gte: now, lte: horizon },
      ...(data.entityId ? { accountId: data.entityId } : {}),
    },
    select: {
      id: true,
      accountId: true,
      institutionName: true,
      expiresAt: true,
      entity: { select: { timeZone: true } },
    },
  });

  const byAccount = new Map<
    string,
    { timeZone: string; rows: typeof connections }
  >();
  for (const c of connections) {
    const bucket = byAccount.get(c.accountId) ?? {
      timeZone: c.entity.timeZone,
      rows: [],
    };
    bucket.rows.push(c);
    byAccount.set(c.accountId, bucket);
  }

  let dispatched = 0;
  for (const [accountId, { timeZone, rows }] of byAccount) {
    if (!isAfterSendHour(now, timeZone)) continue;

    const due = selectDueReminders(
      rows,
      (c) => c.expiresAt as Date,
      now,
      timeZone,
      BANK_CONSENT_OFFSETS,
    );

    for (const { item: c, offsetDays } of due) {
      const expiryYmd = (c.expiresAt as Date).toISOString().slice(0, 10);
      const where = c.institutionName ?? "Your bank connection";
      const result = await dispatchNotification({
        accountId,
        category: NotificationCategory.bankFeed,
        kind: NotificationKind.BANK_CONSENT_EXPIRY,
        title: `Bank connection expires in ${offsetDays} day${offsetDays === 1 ? "" : "s"}`,
        body: `${where} consent expires ${expiryYmd}. Re-authorise to keep your transactions importing.`,
        href: "/settings/banking",
        dedupKey: `bank-consent:${c.id}:${expiryYmd}:${offsetDays}`,
      });
      if (result.channels.length > 0) dispatched++;
    }
  }

  console.log(
    `[jobs] sendBankConsentWarnings: ${connections.length} expiring connection(s) scanned, ${dispatched} dispatched`,
  );
}
