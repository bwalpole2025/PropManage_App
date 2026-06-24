"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { MembershipStatus } from "@/lib/enums";
import { ACTIVE_ENTITY_COOKIE, requireUser } from "@/lib/auth/active-org";

/** Switch the active LandlordEntity (used by the org switcher). */
export async function setActiveEntityAction(entityId: string) {
  const user = await requireUser();

  // Only allow switching to an entity the user actually belongs to.
  const membership = await prisma.membership.findUnique({
    where: {
      userId_landlordEntityId: { userId: user.id, landlordEntityId: entityId },
    },
  });
  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
    throw new Error("You do not have access to that account.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ENTITY_COOKIE, entityId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}
