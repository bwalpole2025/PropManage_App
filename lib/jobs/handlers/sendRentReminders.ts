import { prisma } from "@/lib/db";
import { NotificationKind, RentStatus, TenancyStatus } from "@/lib/enums";
import { formatPence } from "@/lib/format";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { isAfterSendHour } from "@/lib/notifications/schedule";
import {
  MAX_REMINDER_OFFSET,
  RENT_REMINDER_OFFSETS,
  selectDueReminders,
} from "@/lib/notifications/due";
import type { JobPayloads } from "../types";

const DAY = 86_400_000;

/**
 * Upcoming rent-payment reminders. For every still-DUE rent-schedule period
 * falling inside the lead-time window, nudge the account a few days before the
 * money is expected. Days-until is measured in the account's time zone, and
 * delivery is held until the account-local send hour — so the reminder lands on
 * the right local morning wherever the landlord is. The dispatcher dedups on the
 * rent-entry id, so the nudge fires once even though the sweep runs hourly.
 */
export async function sendRentReminders(data: JobPayloads["sendRentReminders"]) {
  const now = new Date();
  const horizon = new Date(now.getTime() + (MAX_REMINDER_OFFSET + 1) * DAY);

  const entries = await prisma.rentScheduleEntry.findMany({
    where: {
      status: RentStatus.DUE,
      dueDate: { gte: new Date(now.getTime() - DAY), lte: horizon },
      tenancy: {
        status: TenancyStatus.ACTIVE,
        ...(data.entityId ? { property: { accountId: data.entityId } } : {}),
      },
    },
    select: {
      id: true,
      dueDate: true,
      expectedPence: true,
      tenancy: {
        select: {
          property: {
            select: {
              accountId: true,
              addressLine1: true,
              entity: { select: { timeZone: true } },
            },
          },
        },
      },
    },
  });

  // Group by account so we can apply the time-zone send-hour gate once each.
  const byAccount = new Map<string, { timeZone: string; rows: typeof entries }>();
  for (const e of entries) {
    const accountId = e.tenancy.property.accountId;
    const timeZone = e.tenancy.property.entity.timeZone;
    const bucket = byAccount.get(accountId) ?? { timeZone, rows: [] };
    bucket.rows.push(e);
    byAccount.set(accountId, bucket);
  }

  let dispatched = 0;
  for (const [accountId, { timeZone, rows }] of byAccount) {
    if (!isAfterSendHour(now, timeZone)) continue;

    const due = selectDueReminders(
      rows,
      (e) => e.dueDate,
      now,
      timeZone,
      RENT_REMINDER_OFFSETS,
    );

    for (const { item: e, offsetDays } of due) {
      const dueOn = e.dueDate.toISOString().slice(0, 10);
      const result = await dispatchNotification({
        accountId,
        category: NotificationCategory.rentAndArrears,
        kind: NotificationKind.RENT_UPCOMING,
        title: `Rent due in ${offsetDays} day${offsetDays === 1 ? "" : "s"}`,
        body: `${formatPence(e.expectedPence)} due ${dueOn} — ${e.tenancy.property.addressLine1}.`,
        href: "/transactions",
        dedupKey: `rent-upcoming:${e.id}`,
      });
      if (result.channels.length > 0) dispatched++;
    }
  }

  console.log(
    `[jobs] sendRentReminders: ${entries.length} upcoming period(s) scanned, ${dispatched} dispatched`,
  );
}
