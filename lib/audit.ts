import "server-only";

import { prisma, type PrismaTx } from "@/lib/db";

// ---------------------------------------------------------------------------
// Append-only audit trail. Every financial change and external (HMRC/bank)
// submission writes one row, so an account's owner — and a later compliance or
// security review — can reconstruct who did what, when. Writes are best-effort:
// auditing must never break the user-facing action that triggered it.
// ---------------------------------------------------------------------------

export const AuditAction = {
  // Financial changes
  TRANSACTION_CREATE: "transaction.create",
  TRANSACTION_UPDATE: "transaction.update",
  TRANSACTION_CATEGORISE: "transaction.categorise",
  TRANSACTION_EXCLUDE: "transaction.exclude",
  TRANSACTION_RESTORE: "transaction.restore",
  TRANSACTION_BULK: "transaction.bulk",
  TRANSACTION_IMPORT: "transaction.import",
  // External submissions / provider token flows
  BANK_CONNECT: "bank.connect",
  BANK_RECONNECT: "bank.reconnect",
  BANK_DISCONNECT: "bank.disconnect",
  MTD_CONNECT: "mtd.connect",
  MTD_DISCONNECT: "mtd.disconnect",
  MTD_SUBMIT_QUARTERLY: "mtd.submit_quarterly",
  MTD_SUBMIT_FINAL: "mtd.submit_final",
  TAX_STATEMENT_GENERATE: "tax_statement.generate",
  // Privacy / data-subject actions
  DATA_EXPORT: "account.data_export",
  ACCOUNT_DELETE_REQUEST: "account.delete_request",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/** Human-readable label for an audit action (used by the activity viewer). */
export const AuditActionLabel: Record<string, string> = {
  [AuditAction.TRANSACTION_CREATE]: "Transaction added",
  [AuditAction.TRANSACTION_UPDATE]: "Transaction edited",
  [AuditAction.TRANSACTION_CATEGORISE]: "Transaction categorised",
  [AuditAction.TRANSACTION_EXCLUDE]: "Transaction excluded",
  [AuditAction.TRANSACTION_RESTORE]: "Transaction restored",
  [AuditAction.TRANSACTION_BULK]: "Bulk transaction change",
  [AuditAction.TRANSACTION_IMPORT]: "Transactions imported",
  [AuditAction.BANK_CONNECT]: "Bank feed connected",
  [AuditAction.BANK_RECONNECT]: "Bank feed reconnected",
  [AuditAction.BANK_DISCONNECT]: "Bank feed disconnected",
  [AuditAction.MTD_CONNECT]: "Connected to HMRC (MTD)",
  [AuditAction.MTD_DISCONNECT]: "Disconnected from HMRC (MTD)",
  [AuditAction.MTD_SUBMIT_QUARTERLY]: "MTD quarterly update submitted",
  [AuditAction.MTD_SUBMIT_FINAL]: "MTD final declaration submitted",
  [AuditAction.TAX_STATEMENT_GENERATE]: "Tax statement generated",
  [AuditAction.DATA_EXPORT]: "Account data exported",
  [AuditAction.ACCOUNT_DELETE_REQUEST]: "Account deletion requested",
};

/** Actions that represent an external submission (HMRC / open-banking). */
export const EXTERNAL_SUBMISSION_ACTIONS = new Set<string>([
  AuditAction.BANK_CONNECT,
  AuditAction.BANK_RECONNECT,
  AuditAction.BANK_DISCONNECT,
  AuditAction.MTD_CONNECT,
  AuditAction.MTD_DISCONNECT,
  AuditAction.MTD_SUBMIT_QUARTERLY,
  AuditAction.MTD_SUBMIT_FINAL,
]);

export interface AuditInput {
  accountId: string;
  actorUserId?: string | null;
  action: AuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

type Client = typeof prisma | PrismaTx;

/**
 * Append one audit-trail row. Best-effort: a logging failure is swallowed (and
 * surfaced to the server console) so it can never roll back or break the action
 * being audited. Pass a transaction client `tx` to record inside the same
 * transaction as the change.
 */
export async function recordAudit(
  input: AuditInput,
  client: Client = prisma,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        accountId: input.accountId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", input.action, err);
  }
}
