import { prisma } from "@/lib/db";

/**
 * GDPR data-portability export: a structured snapshot of everything held for an
 * account, account-scoped by `accountId` (the tenant boundary). Secrets are
 * never included — encrypted bank/HMRC tokens and password hashes are omitted by
 * selecting only safe fields. Archived (soft-deleted) properties and tenancies
 * ARE included via the `archivedAt: undefined` escape hatch so the export is a
 * complete record of personal data.
 */
export async function buildAccountExport(accountId: string) {
  const [
    account,
    portfolios,
    properties,
    transactions,
    documents,
    reminders,
    notes,
    bankConnections,
    taxStatements,
    notifications,
    auditLogs,
  ] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      include: {
        principal: {
          select: { firstName: true, lastName: true, email: true, mobile: true },
        },
        memberships: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        companies: true,
        beneficialOwners: true,
      },
    }),
    prisma.portfolio.findMany({ where: { accountId } }),
    prisma.property.findMany({
      where: { accountId, archivedAt: undefined },
      include: {
        ownerships: true,
        mortgages: true,
        valuations: true,
        insurancePolicies: true,
        tenancies: {
          where: { archivedAt: undefined },
          include: { tenants: true, rentSchedule: true, arrearsAlerts: true },
        },
      },
    }),
    prisma.transaction.findMany({ where: { accountId } }),
    prisma.document.findMany({ where: { accountId } }),
    prisma.reminder.findMany({ where: { accountId } }),
    prisma.note.findMany({ where: { accountId } }),
    // Connection metadata only — encrypted tokens are deliberately NOT selected.
    prisma.bankConnection.findMany({
      where: { accountId },
      select: {
        id: true,
        provider: true,
        institutionName: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            name: true,
            sortCode: true,
            accountNumberMasked: true,
          },
        },
      },
    }),
    prisma.taxStatement.findMany({ where: { accountId } }),
    prisma.notification.findMany({ where: { accountId } }),
    prisma.auditLog.findMany({ where: { accountId }, orderBy: { at: "desc" } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    account,
    portfolios,
    properties,
    transactions,
    documents,
    reminders,
    notes,
    bankConnections,
    taxStatements,
    notifications,
    auditLogs,
  };
}
