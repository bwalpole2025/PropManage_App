"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { createReminder } from "@/services/reminders";
import { createForAccountUsers } from "@/lib/notifications/service";
import { NotificationKind, ReminderState } from "@/lib/enums";
import { formatDate } from "@/lib/format";

export type ReminderActionState = { ok?: boolean; error?: string; at?: number };

function revalidateReminders() {
  revalidatePath("/files/reminders");
  revalidatePath("/files/calendar");
  revalidatePath("/dashboard");
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(140),
  description: z.string().max(2000).optional(),
  dueDate: z.string().min(1, "Due date is required"),
  kind: z.string().optional(),
  propertyId: z.string().optional(),
  tenancyId: z.string().optional(),
});

export async function createReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

    const parsed = createSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid reminder" };
    }
    const d = parsed.data;
    const dueDate = new Date(d.dueDate);
    if (Number.isNaN(dueDate.getTime())) return { error: "Invalid due date" };

    const reminder = await createReminder(entityId, {
      name: d.name,
      description: d.description || null,
      dueDate,
      kind: d.kind,
      propertyId: d.propertyId || null,
      tenancyId: d.tenancyId || null,
    });

    // Reminders can trigger notifications — alert the account it was added.
    await createForAccountUsers({
      accountId: entityId,
      kind: NotificationKind.REMINDER,
      title: `New reminder: ${reminder.name}`,
      body: `Due ${formatDate(reminder.dueDate)}`,
      href: "/files/reminders",
    });

    revalidateReminders();
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function setStatus(
  id: string,
  status: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const res = await prisma.reminder.updateMany({
      where: { id, accountId: entityId },
      data: {
        status,
        completedAt: status === ReminderState.COMPLETED ? new Date() : null,
      },
    });
    if (res.count === 0) return { error: "Reminder not found" };
    revalidateReminders();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function completeReminderAction(id: string) {
  return setStatus(id, ReminderState.COMPLETED);
}

export async function reopenReminderAction(id: string) {
  return setStatus(id, ReminderState.OPEN);
}

export async function deleteReminderAction(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const res = await prisma.reminder.deleteMany({
      where: { id, accountId: entityId },
    });
    if (res.count === 0) return { error: "Reminder not found" };
    revalidateReminders();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** "Clear" — remove all completed reminders for the account. */
export async function clearCompletedRemindersAction(): Promise<{
  ok?: boolean;
  error?: string;
  count?: number;
}> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const res = await prisma.reminder.deleteMany({
      where: { accountId: entityId, status: ReminderState.COMPLETED },
    });
    revalidateReminders();
    return { ok: true, count: res.count };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
