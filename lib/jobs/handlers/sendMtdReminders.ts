import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import {
  MtdStatus,
  NotificationKind,
  ObligationStatus,
  ObligationType,
} from "@/lib/enums";
import { taxYearLabelFor } from "@/lib/format";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { isAfterSendHour } from "@/lib/notifications/schedule";
import {
  MTD_REMINDER_OFFSETS,
  selectDueReminders,
} from "@/lib/notifications/due";
import type { JobPayloads } from "../types";

/** Previous tax-year label, e.g. "2025-26" -> "2024-25". */
function previousTaxYear(label: string): string {
  const startYear = Number.parseInt(label.slice(0, 4), 10) - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * Making Tax Digital quarterly-update deadline reminders. For each MTD-connected
 * account we read its OPEN obligations (quarterly updates + final declaration)
 * and nudge at 14/7/1 days before each due date — measured in the account's time
 * zone, delivered at the local send hour. The dedup key is the obligation period
 * + offset, so each of the three nudges fires exactly once.
 */
export async function sendMtdReminders(data: JobPayloads["sendMtdReminders"]) {
  const now = new Date();

  const connections = await prisma.mtdConnection.findMany({
    where: {
      status: MtdStatus.CONNECTED,
      ...(data.entityId ? { accountId: data.entityId } : {}),
    },
    select: { accountId: true, entity: { select: { timeZone: true } } },
  });

  if (connections.length === 0) {
    console.log("[jobs] sendMtdReminders: 0 connected accounts");
    return;
  }

  const thisYear = taxYearLabelFor(now);
  const lastYear = previousTaxYear(thisYear);

  let dispatched = 0;
  for (const conn of connections) {
    const { accountId } = conn;
    const timeZone = conn.entity.timeZone;
    if (!isAfterSendHour(now, timeZone)) continue;

    // Pull both the current and previous tax year so a January final-declaration
    // deadline (which falls ~10 months into the next year) is still caught.
    const obligationsByYear = await Promise.all(
      [thisYear, lastYear].map((taxYear) =>
        services.hmrc.getObligations({ entityId: accountId, taxYear }),
      ),
    );
    const seen = new Set<string>();
    const obligations = obligationsByYear.flat().filter((o) => {
      if (o.status !== ObligationStatus.OPEN) return false;
      if (seen.has(o.periodKey)) return false;
      seen.add(o.periodKey);
      return true;
    });

    const due = selectDueReminders(
      obligations,
      (o) => new Date(o.dueDate),
      now,
      timeZone,
      MTD_REMINDER_OFFSETS,
    );

    for (const { item: o, offsetDays } of due) {
      const dueOn = o.dueDate.slice(0, 10);
      const what =
        o.type === ObligationType.FINAL_DECLARATION
          ? "MTD final declaration"
          : "MTD quarterly update";
      const result = await dispatchNotification({
        accountId,
        category: NotificationCategory.taxDeadlines,
        kind: NotificationKind.MTD_DEADLINE,
        title: `${what} due in ${offsetDays} day${offsetDays === 1 ? "" : "s"}`,
        body: `Your ${what.toLowerCase()} (${o.periodKey}) is due ${dueOn}.`,
        href: "/mtd",
        dedupKey: `mtd-deadline:${o.periodKey}:${offsetDays}`,
      });
      if (result.channels.length > 0) dispatched++;
    }
  }

  console.log(
    `[jobs] sendMtdReminders: ${connections.length} connected account(s), ${dispatched} dispatched`,
  );
}
