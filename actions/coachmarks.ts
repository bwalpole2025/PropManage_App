"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/active-org";

export type CoachmarkLevel = "ok" | "off";
export type CoachmarkState = Record<string, CoachmarkLevel>;

/**
 * Persist that the current user has dismissed a section's first-run coachmark.
 * "ok" = seen once, "off" = don't show again — both suppress the auto-open, and
 * being server-side they survive reloads and sync across the user's browsers.
 */
export async function dismissCoachmarkAction(
  section: string,
  level: CoachmarkLevel = "ok",
): Promise<void> {
  const user = await requireUser();
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { coachmarkState: true },
  });
  const state: CoachmarkState = {
    ...((row.coachmarkState as CoachmarkState | null) ?? {}),
    [section]: level,
  };
  await prisma.user.update({
    where: { id: user.id },
    data: { coachmarkState: state },
  });
}
