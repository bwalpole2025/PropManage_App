import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

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
