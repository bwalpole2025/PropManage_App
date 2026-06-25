"use server";

import { revalidatePath } from "next/cache";
import { getActiveContext } from "@/lib/auth/active-org";
import { markAllRead, markRead } from "@/lib/notifications/service";

export async function markNotificationReadAction(id: string) {
  const { entityId, user } = await getActiveContext();
  await markRead(id, entityId, user.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const { entityId, user } = await getActiveContext();
  await markAllRead(entityId, user.id);
  revalidatePath("/notifications");
}
