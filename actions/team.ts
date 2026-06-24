"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import {
  MembershipRole,
  MembershipStatus,
  UserKind,
} from "@/lib/enums";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum([
    MembershipRole.ACCOUNTANT,
    MembershipRole.MANAGER,
    MembershipRole.ASSISTANT,
    MembershipRole.VIEWER,
  ]),
});

/** Invite a user (e.g. an accountant) to the active entity with a role. */
export async function inviteMemberAction(formData: FormData) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_MEMBERS);

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invite");
  }
  const email = parsed.data.email.toLowerCase();
  const role = parsed.data.role;

  // Find or create the invited user (no password until they accept).
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      kind:
        role === MembershipRole.ACCOUNTANT
          ? UserKind.ACCOUNTANT
          : role === MembershipRole.ASSISTANT
            ? UserKind.ASSISTANT
            : UserKind.LANDLORD,
    },
  });

  const existing = await prisma.membership.findUnique({
    where: {
      userId_landlordEntityId: { userId: user.id, landlordEntityId: entityId },
    },
  });
  if (existing && existing.status !== MembershipStatus.REVOKED) {
    throw new Error("That person already has access.");
  }

  const inviteToken = randomUUID();
  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: { role, status: MembershipStatus.INVITED, inviteEmail: email, inviteToken },
    });
  } else {
    await prisma.membership.create({
      data: {
        userId: user.id,
        landlordEntityId: entityId,
        role,
        status: MembershipStatus.INVITED,
        inviteEmail: email,
        inviteToken,
      },
    });
  }

  revalidatePath("/settings/team");
}

/** Revoke a member's access. */
export async function revokeMemberAction(membershipId: string) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_MEMBERS);

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, landlordEntityId: entityId },
  });
  if (!membership) throw new Error("Member not found");
  if (membership.role === MembershipRole.OWNER) {
    throw new Error("You can't revoke the account owner.");
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: MembershipStatus.REVOKED },
  });

  revalidatePath("/settings/team");
}

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().optional(),
  password: z.string().optional(),
});

/** Accept an invite: optionally set a password for a brand-new user. */
export async function acceptInviteAction(formData: FormData) {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid request");
  const { token, name, password } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { inviteToken: token },
    include: { user: true },
  });
  if (!membership || membership.status !== MembershipStatus.INVITED) {
    throw new Error("This invite is no longer valid.");
  }

  // New user without a password must set one to accept.
  if (!membership.user.passwordHash) {
    if (!password || password.length < 8) {
      throw new Error("Choose a password of at least 8 characters.");
    }
    await prisma.user.update({
      where: { id: membership.userId },
      data: {
        name: name || membership.user.name,
        passwordHash: await bcrypt.hash(password, 10),
        emailVerified: new Date(),
      },
    });
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: MembershipStatus.ACTIVE,
      acceptedAt: new Date(),
      inviteToken: null,
    },
  });

  // New user who just set a password: sign them straight in (signIn throws a
  // NEXT_REDIRECT to /dashboard on success, which must propagate).
  if (password && membership.user.email) {
    await signIn("credentials", {
      email: membership.user.email,
      password,
      redirectTo: "/dashboard",
    });
  }

  // Existing user accepting without setting a password: send them to sign in.
  redirect("/login");
}
