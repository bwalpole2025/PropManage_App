import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import {
  AuditActionLabel,
  EXTERNAL_SUBMISSION_ACTIONS,
} from "@/lib/audit";

export interface AuditLogRow {
  id: string;
  action: string;
  actionLabel: string;
  isExternal: boolean;
  actorName: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  at: Date;
}

/**
 * Read the account's audit trail, newest first. Account-scoped by `accountId`
 * (the tenant boundary) so an actor can only ever see their own account's log.
 */
export async function listAuditLog(
  accountId: string,
  opts: { limit?: number } = {},
): Promise<AuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    where: { accountId },
    orderBy: { at: "desc" },
    take: opts.limit ?? 100,
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actionLabel: AuditActionLabel[r.action] ?? r.action,
    isExternal: EXTERNAL_SUBMISSION_ACTIONS.has(r.action),
    actorName: r.actor ? fullName(r.actor) : "System",
    targetType: r.targetType,
    targetId: r.targetId,
    metadata: r.metadata,
    at: r.at,
  }));
}
