"use server";

import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/active-org";

export interface SecurityFormState {
  error?: string;
  success?: string;
}

/**
 * Start TOTP enrolment: generate + store a secret (not yet enabled) and return
 * the otpauth URL so the client can render a QR code. Once confirmed, login-time
 * enforcement applies — see authorize() in lib/auth/index.ts (and the two-step
 * prompt in loginAction), which require a valid TOTP code for 2FA-enabled users.
 */
export async function beginTotpEnrollmentAction(): Promise<{
  otpauthUrl: string;
  secret: string;
  qrDataUrl: string;
}> {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });

  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, twoFactorEnabled: false },
  });

  const otpauthUrl = authenticator.keyuri(user.email, "PropManage", secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { otpauthUrl, secret, qrDataUrl };
}

export async function confirmTotpEnrollmentAction(
  _prev: SecurityFormState,
  formData: FormData,
): Promise<SecurityFormState> {
  const sessionUser = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });
  if (!user.totpSecret) {
    return { error: "Start enrolment first." };
  }
  const valid = authenticator.verify({ token: code, secret: user.totpSecret });
  if (!valid) return { error: "That code is incorrect — try again." };

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });
  return { success: "Two-factor authentication is now enabled." };
}

export async function disableTotpAction(): Promise<SecurityFormState> {
  const sessionUser = await requireUser();
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { totpSecret: null, twoFactorEnabled: false },
  });
  return { success: "Two-factor authentication disabled." };
}
