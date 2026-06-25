"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { requireUser } from "@/lib/auth/active-org";
import {
  createEmailVerifyToken,
  consumeEmailVerifyToken,
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/auth/tokens";
import { emailSender } from "@/lib/email";
import { fullName } from "@/lib/format";
import { forgotPasswordSchema, resetPasswordSchema } from "@/schemas/auth";
import {
  LandlordType,
  MembershipRole,
  MembershipStatus,
  UserRole,
} from "@/lib/enums";

export interface AuthFormState {
  error?: string;
  success?: string;
}

function appBaseUrl(): string {
  return (
    process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  );
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
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const lastName = rest.join(" ") || null;

  // Create the user, their first Account (with a default portfolio), and an
  // OWNER membership.
  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role: UserRole.OWNER,
      ownedEntities: {
        create: {
          displayName: entityName,
          type: entityType,
          portfolios: {
            create: {
              name: "Personal — Default",
              type: "personal",
              isDefault: true,
            },
          },
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
      accountId: entity.id,
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

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/** Send (or resend) a verification email to the current user. */
export async function requestEmailVerificationAction(): Promise<AuthFormState> {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });
  if (user.emailVerified) return { success: "Your email is already verified." };

  const raw = await createEmailVerifyToken(user.id);
  await emailSender.sendVerificationEmail({
    to: user.email,
    name: fullName(user),
    verifyUrl: `${appBaseUrl()}/verify-email/${raw}`,
  });
  return { success: "Verification email sent — check your inbox." };
}

/** Consume a verification token and mark the email verified. */
export async function verifyEmailAction(
  token: string,
): Promise<{ ok: boolean }> {
  const result = await consumeEmailVerifyToken(token);
  if (!result) return { ok: false };
  await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerified: new Date() },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** Always returns the same message — never reveals whether the email exists. */
export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email." };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (user) {
    const raw = await createPasswordResetToken(user.id);
    await emailSender.sendPasswordResetEmail({
      to: user.email,
      name: fullName(user),
      resetUrl: `${appBaseUrl()}/reset-password/${raw}`,
    });
  }
  return {
    success: "If that email has an account, a reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const result = await consumePasswordResetToken(parsed.data.token);
  if (!result) {
    return { error: "This reset link is invalid or has expired." };
  }
  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  });
  redirect("/login?reset=1");
}
