"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { isBetaAllowed } from "@/lib/auth/beta-allowlist";
import { requireUser } from "@/lib/auth/active-org";
import {
  createEmailVerifyToken,
  consumeEmailVerifyToken,
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/auth/tokens";
import { emailSender } from "@/lib/email";
import { fullName } from "@/lib/format";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema, resetPasswordSchema } from "@/schemas/auth";

export interface AuthFormState {
  error?: string;
  success?: string;
  /** Set when the password was correct but a 2FA code is needed to continue. */
  twoFactorRequired?: boolean;
}

function appBaseUrl(): string {
  return (
    process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  );
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().optional(),
});

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    // Absent when 2FA isn't being prompted; coerce null -> undefined so the
    // optional code field validates for a normal (non-2FA) sign-in.
    code: formData.get("code") ?? undefined,
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const { email, password, code } = parsed.data;

  // Throttle sign-in attempts (brute-force / credential-stuffing): per source IP
  // and per target email. Counts before the password check so failed guesses are
  // limited regardless of outcome.
  const ip = await clientIp();
  const limited =
    (await enforceRateLimit(`login:ip:${ip}`, 10, 300)) ??
    (await enforceRateLimit(`login:email:${email.toLowerCase()}`, 5, 900));
  if (limited) return { error: limited };

  // Closed-beta gate. Reject any email that isn't on the BETA_TESTER_EMAILS
  // allowlist up front, with a clear 403-style message for unauthorised testers
  // who find the hidden /beta-access route. (authorize() enforces this again.)
  if (!isBetaAllowed(email)) {
    return {
      error: "403 — This email isn't part of the PropManage closed beta.",
    };
  }

  // Verify the password first so we can decide whether to prompt for a 2FA code
  // without revealing 2FA status for a wrong password. The TOTP code itself is
  // verified in exactly one place — authorize() in lib/auth/index.ts, the real
  // security boundary — so there's no double-verification timing race.
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  const passwordOk =
    !!user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !passwordOk) {
    return { error: "Invalid email or password." };
  }

  // Password is correct: if 2FA is on and no code was supplied yet, ask for one.
  const hasCode = !!(code ?? "").replace(/\D/g, "");
  if (user.twoFactorEnabled && !hasCode) {
    return { twoFactorRequired: true };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      totp: code ?? "",
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The password already checked out above, so an auth failure here can only
      // be a rejected TOTP code (which authorize() enforces for 2FA accounts).
      if (user.twoFactorEnabled) {
        return {
          twoFactorRequired: true,
          error: "That code is incorrect — try again.",
        };
      }
      return { error: "Invalid email or password." };
    }
    throw error; // re-throw NEXT_REDIRECT so navigation works
  }
  return {};
}

// Public sign-ups are disabled during the closed beta — PropManage is
// invite-only. Access is granted by adding an email to BETA_TESTER_EMAILS, never
// by self-registration, so this action always refuses. Disabling it here (not
// just hiding the /register page) keeps a direct POST from creating an account.
export async function registerAction(
  _prev: AuthFormState,
  _formData: FormData,
): Promise<AuthFormState> {
  return {
    error: "Public sign-ups are closed during the PropManage closed beta.",
  };
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
  const limited = await enforceRateLimit(
    `emailverify:${sessionUser.id}`,
    3,
    3600,
    "You've requested too many verification emails. Please wait a while.",
  );
  if (limited) return { error: limited };
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

  // Throttle reset emails (inbox flooding / Resend cost abuse): per IP and per
  // target address. Unauthenticated endpoint, so this is the only guard.
  const ip = await clientIp();
  const limited =
    (await enforceRateLimit(`pwreset:ip:${ip}`, 5, 3600)) ??
    (await enforceRateLimit(
      `pwreset:email:${parsed.data.email.toLowerCase()}`,
      3,
      3600,
    ));
  if (limited) return { error: limited };

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
