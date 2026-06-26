// Shared "finish the bank link" core: exchange code -> persist connection +
// accounts (encrypting opaque tokens, never credentials) -> backfill history.
// Used by both the server action (mock/demo consent screen) and the real
// TrueLayer OAuth callback route, so there's a single persistence path.

import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { BankConnStatus } from "@/lib/enums";
import { encryptToken } from "@/lib/crypto";
import { ingestBankConnection } from "@/lib/bank-ingest";
import { recordAudit, AuditAction } from "@/lib/audit";

const NINETY_DAYS = 90 * 86_400_000;
// Open-banking consent typically lasts ~90 days; the adapter refreshes the
// short-lived access token underneath this window on demand.
const CONSENT_WINDOW_MS = NINETY_DAYS;

export async function persistBankLink(input: {
  entityId: string;
  actorUserId: string;
  linkSessionId: string;
  code: string;
  institutionName?: string;
}): Promise<{ imported: number; connectionId: string }> {
  const linked = await services.bankFeed.completeLink({
    entityId: input.entityId,
    linkSessionId: input.linkSessionId,
    code: input.code,
  });

  // Store the CONSENT expiry (not the access-token expiry, which the adapter
  // refreshes itself). Mock feeds carry no tokens -> deterministic placeholders.
  const tokenData = {
    status: BankConnStatus.ACTIVE,
    expiresAt: new Date(Date.now() + CONSENT_WINDOW_MS),
    accessTokenEnc: encryptToken(
      linked.accessToken ?? `mock-access-${linked.connectionId}`,
    ),
    refreshTokenEnc: encryptToken(
      linked.refreshToken ?? `mock-refresh-${linked.connectionId}`,
    ),
    institutionName:
      input.institutionName ?? linked.institutionName ?? "Bank (demo)",
  };

  const existing = await prisma.bankConnection.findFirst({
    where: { accountId: input.entityId, providerConnectionId: linked.connectionId },
    select: { id: true },
  });
  const connection = existing
    ? await prisma.bankConnection.update({
        where: { id: existing.id },
        data: tokenData,
        select: { id: true },
      })
    : await prisma.bankConnection.create({
        data: {
          accountId: input.entityId,
          provider: services.bankFeed.providerName,
          providerConnectionId: linked.connectionId,
          ...tokenData,
        },
        select: { id: true },
      });

  for (const acc of linked.accounts) {
    const found = await prisma.bankAccount.findFirst({
      where: { bankConnectionId: connection.id, providerAccountId: acc.id },
      select: { id: true },
    });
    if (!found) {
      await prisma.bankAccount.create({
        data: {
          bankConnectionId: connection.id,
          providerAccountId: acc.id,
          name: acc.name,
          sortCode: acc.sortCode ?? null,
          accountNumberMasked: acc.accountNumberMasked ?? null,
          currency: acc.currency ?? "GBP",
        },
      });
    }
  }

  // Historical import — no per-payment notifications for the backfill.
  const { imported } = await ingestBankConnection(connection.id, { notify: false });

  await recordAudit({
    accountId: input.entityId,
    actorUserId: input.actorUserId,
    action: AuditAction.BANK_CONNECT,
    targetType: "BankConnection",
    targetId: connection.id,
    metadata: {
      provider: services.bankFeed.providerName,
      institutionName: tokenData.institutionName,
      imported,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/transactions/reconcile");
  revalidatePath("/dashboard");
  revalidatePath("/settings/banking");
  return { imported, connectionId: connection.id };
}
