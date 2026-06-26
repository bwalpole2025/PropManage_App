import { prisma } from "@/lib/db";
import { NotificationKind, RentStatus, TenancyStatus } from "@/lib/enums";
import { formatPence } from "@/lib/format";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { JobPayloads } from "../types";

const DAY = 86_400_000;

/**
 * Detect rent arrears: rent-schedule periods past their due date that aren't
 * fully paid become OVERDUE/PARTIAL with an open ArrearsAlert; periods that have
 * since been paid resolve their alert. When an alert OPENS, raise an in-app
 * "Rent overdue" notification (and a preference-gated email).
 */
export async function computeArrears(data: JobPayloads["computeArrears"]) {
  const now = new Date();
  const entries = await prisma.rentScheduleEntry.findMany({
    where: {
      tenancy: {
        status: TenancyStatus.ACTIVE,
        ...(data.entityId
          ? { property: { accountId: data.entityId } }
          : {}),
      },
      status: { not: RentStatus.WAIVED },
    },
    include: {
      arrearsAlerts: { where: { resolvedAt: null } },
      tenancy: {
        select: {
          property: { select: { accountId: true, addressLine1: true } },
          tenants: {
            where: { isLeadTenant: true },
            take: 1,
            select: { name: true },
          },
        },
      },
    },
  });

  let opened = 0;
  let resolved = 0;

  for (const e of entries) {
    const overdue = e.dueDate < now && e.receivedPence < e.expectedPence;

    if (overdue) {
      const shortfall = e.expectedPence - e.receivedPence;
      const daysOverdue = Math.floor((now.getTime() - e.dueDate.getTime()) / DAY);
      const status =
        e.receivedPence > 0 ? RentStatus.PARTIAL : RentStatus.OVERDUE;
      if (e.status !== status) {
        await prisma.rentScheduleEntry.update({
          where: { id: e.id },
          data: { status },
        });
      }
      const open = e.arrearsAlerts[0];
      if (open) {
        await prisma.arrearsAlert.update({
          where: { id: open.id },
          data: { shortfallPence: shortfall, daysOverdue },
        });
      } else {
        const alert = await prisma.arrearsAlert.create({
          data: {
            tenancyId: e.tenancyId,
            rentScheduleEntryId: e.id,
            shortfallPence: shortfall,
            daysOverdue,
          },
          select: { id: true },
        });
        opened++;
        await notifyArrears(alert.id, e.tenancy, shortfall, daysOverdue);
      }
    } else if (e.receivedPence >= e.expectedPence && e.arrearsAlerts.length) {
      // Now paid — resolve any open alert.
      await prisma.arrearsAlert.updateMany({
        where: { rentScheduleEntryId: e.id, resolvedAt: null },
        data: { resolvedAt: now },
      });
      if (e.status !== RentStatus.PAID) {
        await prisma.rentScheduleEntry.update({
          where: { id: e.id },
          data: { status: RentStatus.PAID },
        });
      }
      resolved += e.arrearsAlerts.length;
    }
  }

  console.log(
    `[jobs] computeArrears: ${entries.length} periods checked, ${opened} alert(s) opened, ${resolved} resolved`,
  );
}

async function notifyArrears(
  alertId: string,
  tenancy: {
    property: { accountId: string; addressLine1: string };
    tenants: { name: string }[];
  },
  shortfallPence: number,
  daysOverdue: number,
) {
  const who = tenancy.tenants[0]?.name ?? "a tenant";
  const body = `${formatPence(shortfallPence)} overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} — ${who}, ${tenancy.property.addressLine1}.`;

  // Fan out to every channel enabled for the rent & arrears category. The alert
  // id is the dedup key, so re-running the sweep never re-notifies an open alert.
  await dispatchNotification({
    accountId: tenancy.property.accountId,
    category: NotificationCategory.rentAndArrears,
    kind: NotificationKind.RENT_OVERDUE,
    title: "Rent overdue",
    body,
    href: "/transactions",
    dedupKey: `arrears:${alertId}`,
  });
}
