import { randomBytes, randomInt, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h
const MOBILE_OTP_TTL_MS = 10 * 60 * 1000; // 10m

/** A URL-safe random token; only the sha256 hash is persisted. */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createEmailVerifyToken(userId: string): Promise<string> {
  const { raw, hash } = generateToken();
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
  });
  return raw;
}

export async function consumeEmailVerifyToken(
  raw: string,
): Promise<{ userId: string } | null> {
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.emailVerificationToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { userId: row.userId };
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const { raw, hash } = generateToken();
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return raw;
}

export async function consumePasswordResetToken(
  raw: string,
): Promise<{ userId: string } | null> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { userId: row.userId };
}

/** Create a single-use 6-digit mobile OTP; returns the raw code to send by SMS. */
export async function createMobileOtp(userId: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Invalidate any outstanding codes — one active OTP per user.
  await prisma.mobileVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.mobileVerificationToken.create({
    data: {
      userId,
      codeHash: hashToken(code),
      expiresAt: new Date(Date.now() + MOBILE_OTP_TTL_MS),
    },
  });
  return code;
}

/** Verify + consume a mobile OTP. Returns true on success. */
export async function consumeMobileOtp(
  userId: string,
  code: string,
): Promise<boolean> {
  const row = await prisma.mobileVerificationToken.findFirst({
    where: { userId, codeHash: hashToken(code), usedAt: null },
  });
  if (!row || row.expiresAt < new Date()) return false;
  await prisma.mobileVerificationToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}
