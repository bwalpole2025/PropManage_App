"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import {
  LandlordType,
  MembershipRole,
  MembershipStatus,
  UserKind,
} from "@/lib/enums";

export interface AuthFormState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error; // re-throw NEXT_REDIRECT so navigation works
  }
  return {};
}

const registerSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  entityName: z.string().min(1, "Enter a portfolio name"),
  entityType: z.enum([
    LandlordType.INDIVIDUAL,
    LandlordType.PORTFOLIO,
    LandlordType.LIMITED_COMPANY,
  ]),
});

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    entityName: formData.get("entityName"),
    entityType: formData.get("entityType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { name, email, password, entityName, entityType } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);

  // Create the user, their first LandlordEntity, and an OWNER membership.
  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      kind: UserKind.LANDLORD,
      ownedEntities: {
        create: {
          displayName: entityName,
          type: entityType,
        },
      },
    },
  });

  // The entity was created via nested write; attach the OWNER membership.
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: email.toLowerCase() },
    include: { ownedEntities: true },
  });
  const entity = user.ownedEntities[0];
  await prisma.membership.create({
    data: {
      userId: user.id,
      landlordEntityId: entity.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      acceptedAt: new Date(),
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — please sign in." };
    }
    throw error;
  }
  return {};
}

export async function logoutAction() {
  const { signOut } = await import("@/lib/auth");
  await signOut({ redirectTo: "/login" });
}
