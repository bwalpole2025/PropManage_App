"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  LandlordType,
  MembershipRole,
  MembershipStatus,
} from "@/lib/enums";
import { ACTIVE_ENTITY_COOKIE, requireUser } from "@/lib/auth/active-org";

const schema = z.object({
  displayName: z.string().min(1),
  type: z.enum([
    LandlordType.INDIVIDUAL,
    LandlordType.PORTFOLIO,
    LandlordType.LIMITED_COMPANY,
  ]),
});

/** Create a new LandlordEntity owned by the current user and switch to it. */
export async function createEntityAction(formData: FormData) {
  const user = await requireUser();
  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    type: formData.get("type"),
  });
  if (!parsed.success) throw new Error("Enter a name and account type.");

  const entity = await prisma.landlordEntity.create({
    data: {
      displayName: parsed.data.displayName,
      type: parsed.data.type,
      principalUserId: user.id,
      memberships: {
        create: {
          userId: user.id,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
          acceptedAt: new Date(),
        },
      },
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ENTITY_COOKIE, entity.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}
