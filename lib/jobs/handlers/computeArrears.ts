import { prisma } from "@/lib/db";
import { RentStatus, TenancyStatus } from "@/lib/enums";
import type { JobPayloads } from "../types";

const DAY = 86_400_000;

/**
 * Detect rent arrears: rent-schedule periods past their due date that aren't
 * fully paid become OVERDUE/PARTIAL with an open ArrearsAlert; periods that have
 * since been paid resolve their alert.
 */
export async function computeArrears(data: JobPayloads["computeArrears"]) {
  const now = new Date();
  const entries = await prisma.rentScheduleEntry.findMany({
    where: {
      tenancy: {
        status: TenancyStatus.ACTIVE,
        ...(data.entityId
          ? { property: { landlordEntityId: data.entityId } }
          : {}),
      },
      status: { not: RentStatus.WAIVED },
    },
    include: { arrearsAlerts: { where: { resolvedAt: null } } },
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
        await prisma.arrearsAlert.create({
          data: {
            tenancyId: e.tenancyId,
            rentScheduleEntryId: e.id,
            shortfallPence: shortfall,
            daysOverdue,
          },
        });
        opened++;
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
