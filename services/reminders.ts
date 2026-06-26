import type { Reminder } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ImportantDateKind, ReminderState } from "@/lib/enums";

export interface CreateReminderInput {
  name: string;
  description?: string | null;
  dueDate: Date;
  kind?: string;
  propertyId?: string | null;
  tenancyId?: string | null;
}

/**
 * Create an OPEN reminder. Validates property/tenancy ownership. A new OPEN
 * reminder appears under "My work" and on the Calendar (which lists OPEN
 * reminders) automatically.
 */
export async function createReminder(
  entityId: string,
  input: CreateReminderInput,
): Promise<Reminder> {
  if (input.propertyId) {
    const ok = await prisma.property.findFirst({
      where: { id: input.propertyId, accountId: entityId },
      select: { id: true },
    });
    if (!ok) throw new Error("Property not found");
  }
  if (input.tenancyId) {
    const ok = await prisma.tenancy.findFirst({
      where: { id: input.tenancyId, property: { accountId: entityId } },
      select: { id: true },
    });
    if (!ok) throw new Error("Tenancy not found");
  }
  return prisma.reminder.create({
    data: {
      accountId: entityId,
      name: input.name,
      description: input.description || null,
      dueDate: input.dueDate,
      kind: input.kind || ImportantDateKind.CUSTOM,
      status: ReminderState.OPEN,
      propertyId: input.propertyId || null,
      tenancyId: input.tenancyId || null,
    },
  });
}

export type ReminderRow = Reminder;

export interface ReminderFilters {
  tab?: string; // "open" (My work) | "completed"
}

export async function getRemindersScreen(
  entityId: string,
  filters: ReminderFilters = {},
) {
  const tab: "open" | "completed" =
    filters.tab === "completed" ? "completed" : "open";
  const status =
    tab === "completed" ? ReminderState.COMPLETED : ReminderState.OPEN;

  const [reminders, openCount, completedCount, properties, tenancies] =
    await Promise.all([
      prisma.reminder.findMany({
        where: { accountId: entityId, status },
        orderBy:
          tab === "completed"
            ? [{ completedAt: "desc" }]
            : [{ dueDate: "asc" }],
      }),
      prisma.reminder.count({
        where: { accountId: entityId, status: ReminderState.OPEN },
      }),
      prisma.reminder.count({
        where: { accountId: entityId, status: ReminderState.COMPLETED },
      }),
      prisma.property.findMany({
        where: { accountId: entityId, archivedAt: null },
        select: { id: true, addressLine1: true },
        orderBy: { addressLine1: "asc" },
      }),
      prisma.tenancy.findMany({
        where: { property: { accountId: entityId }, archivedAt: null },
        select: {
          id: true,
          property: { select: { addressLine1: true } },
          tenants: {
            where: { isLeadTenant: true },
            take: 1,
            select: { name: true },
          },
        },
        orderBy: { startDate: "desc" },
      }),
    ]);

  return {
    tab,
    reminders,
    counts: { open: openCount, completed: completedCount },
    properties,
    tenancies: tenancies.map((t) => ({
      id: t.id,
      label: `${t.tenants[0]?.name ?? "Tenant"} · ${t.property.addressLine1}`,
    })),
  };
}
