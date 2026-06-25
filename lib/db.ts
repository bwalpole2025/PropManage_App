import { PrismaClient } from "@prisma/client";

// Models that carry `archivedAt` and should default-exclude soft-deleted rows.
const SOFT_DELETE_MODELS = new Set(["Property", "Tenancy"]);

// Models that are *directly* scoped by `accountId` (the account_id).
// Nested-scoped models (e.g. Tenancy via Property, RentScheduleEntry via
// Tenancy) are intentionally omitted — their scope is enforced via the parent.
const DIRECTLY_SCOPED_MODELS = new Set([
  "Property",
  "Portfolio",
  "Company",
  "BeneficialOwner",
  "Transaction",
  "Document",
  "Reminder",
  "Mortgage",
  "Valuation",
  "Note",
  "FileObject",
  "BankConnection",
  "TaxStatement",
  "AuditLog",
]);

// find-style reads where soft-delete exclusion is safe to inject (NOT findUnique,
// whose `where` only accepts unique fields).
const SOFT_DELETE_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

const SCOPE_CHECK_OPS = new Set(["findMany", "count", "aggregate", "groupBy"]);

function buildClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    name: "tenant-guards",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = (args ?? {}) as { where?: Record<string, unknown> };

          // 1. Soft-delete: default-exclude archived rows unless the caller
          //    explicitly mentions `archivedAt` (escape hatch for archive views:
          //    pass `where: { archivedAt: undefined }` to include everything).
          if (
            model &&
            SOFT_DELETE_MODELS.has(model) &&
            SOFT_DELETE_OPS.has(operation)
          ) {
            const where = (a.where ?? {}) as Record<string, unknown>;
            if (!("archivedAt" in where)) {
              where.archivedAt = null;
              a.where = where;
              args = a as typeof args;
            }
          }

          // 2. Tenant-scope diagnostic (defence-in-depth; the real authority is
          //    requireEntityAccess in lib/auth/active-org.ts). Warns in dev when a
          //    bulk read on a directly-scoped model omits accountId and any
          //    id/boolean-composition that might carry it. Escalate to throw with
          //    STRICT_TENANT_SCOPE=1.
          if (
            model &&
            DIRECTLY_SCOPED_MODELS.has(model) &&
            SCOPE_CHECK_OPS.has(operation)
          ) {
            const where = (a.where ?? {}) as Record<string, unknown>;
            const looksScoped =
              "accountId" in where ||
              "id" in where ||
              "AND" in where ||
              "OR" in where;
            if (!looksScoped) {
              const msg = `[tenant-scope] ${model}.${operation} without accountId in where — verify the call is account-scoped.`;
              if (process.env.STRICT_TENANT_SCOPE === "1") throw new Error(msg);
              if (process.env.NODE_ENV === "development") console.warn(msg);
            }
          }

          return query(args);
        },
      },
    },
  });
}

type ExtendedPrisma = ReturnType<typeof buildClient>;

/** The client handed to an interactive `prisma.$transaction(async (tx) => …)`. */
export type PrismaTx = Omit<
  ExtendedPrisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrisma | undefined;
};

export const prisma: ExtendedPrisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
