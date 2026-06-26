import { prisma, type PrismaTx } from "@/lib/db";
import { taxYearLabelFor, taxYearStartDate } from "@/lib/format";
import { getTaxEstimate } from "./tax";
import { getOwnerTaxEstimates } from "./owner-tax";
import type { TaxBand, TaxEstimateResult } from "@/lib/tax";

export interface TaxStatementOptions {
  usePropertyAllowance?: boolean;
  taxBand?: TaxBand;
}

/** The persisted-statement fields derived from a computed estimate. */
function snapshotFields(e: TaxEstimateResult) {
  return {
    boxBreakdown: e.boxBreakdown,
    totalIncomePence: e.totalIncomePence,
    totalAllowableExpensesPence: e.totalAllowableExpensesPence,
    financeCostsPence: e.financeCostsPence,
    financeCostTaxReductionPence: e.financeCostTaxReductionPence,
    propertyAllowanceUsedPence: e.propertyAllowanceUsedPence,
    taxableProfitPence: e.taxableProfitPence,
    estimatedTaxPence: e.estimatedTaxPence,
  };
}

/**
 * Create (regenerate) the tax statement for a tax year: one account-level row
 * plus one per beneficial owner with property holdings, each holding the SA105
 * box breakdown + totals. The whole year is replaced atomically (the
 * @@unique key allows NULLs so we delete-then-create rather than upsert).
 * Scoped by accountId.
 */
export async function createTaxStatements(
  entityId: string,
  taxYearLabel: string | undefined,
  opts: TaxStatementOptions = {},
) {
  const taxYear = taxYearLabel ?? taxYearLabelFor();
  const taxYearStart = taxYearStartDate(taxYear);

  const [{ estimate }, ownerTax] = await Promise.all([
    getTaxEstimate(entityId, taxYear, opts),
    getOwnerTaxEstimates(entityId, taxYear, opts),
  ]);
  const ownersWithHoldings = ownerTax.owners.filter(
    (o) => o.ownedPropertyCount > 0,
  );

  await prisma.$transaction(async (tx: PrismaTx) => {
    // Serialize per (account, year) so two concurrent "create" calls can't both
    // delete-then-insert and leave duplicate account-level rows (the @@unique
    // key allows NULLs, so it can't dedupe them). The xact lock is released on
    // commit/rollback; a concurrent call blocks until this one finishes, then
    // sees this row and replaces it.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${entityId}:${taxYearStart.toISOString()}`})::bigint)`;
    await tx.taxStatement.deleteMany({ where: { accountId: entityId, taxYearStart } });
    await tx.taxStatement.create({
      data: {
        accountId: entityId,
        portfolioId: null,
        beneficialOwnerId: null,
        taxYearStart,
        taxYearLabel: taxYear,
        ...snapshotFields(estimate),
      },
    });
    for (const o of ownersWithHoldings) {
      await tx.taxStatement.create({
        data: {
          accountId: entityId,
          beneficialOwnerId: o.owner.id,
          taxYearStart,
          taxYearLabel: taxYear,
          ...snapshotFields(o.estimate),
        },
      });
    }
  });

  return { taxYear };
}

/** Tax years that have a created (account-level) statement, newest first. */
export async function listTaxStatementYears(entityId: string) {
  return prisma.taxStatement.findMany({
    where: { accountId: entityId, beneficialOwnerId: null, portfolioId: null },
    select: { taxYearLabel: true, computedAt: true },
    orderBy: { taxYearStart: "desc" },
    distinct: ["taxYearLabel"], // tolerate any historical duplicate rows
  });
}

/** A created statement for a tax year: the account-level row + per-owner rows. */
export async function getTaxStatement(entityId: string, taxYearLabel: string) {
  const taxYearStart = taxYearStartDate(taxYearLabel);
  const rows = await prisma.taxStatement.findMany({
    where: { accountId: entityId, taxYearStart },
    include: { beneficialOwner: { select: { id: true, legalName: true } } },
  });
  // Pick the newest account-level row deterministically (belt-and-braces against
  // any historical duplicates) and dedupe owners to the latest per owner.
  const account = rows
    .filter((r) => r.beneficialOwnerId === null && r.portfolioId === null)
    .sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime())[0];
  if (!account) return null;

  const latestByOwner = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!r.beneficialOwnerId || !r.beneficialOwner) continue;
    const prev = latestByOwner.get(r.beneficialOwnerId);
    if (!prev || r.computedAt.getTime() > prev.computedAt.getTime()) {
      latestByOwner.set(r.beneficialOwnerId, r);
    }
  }
  const owners = [...latestByOwner.values()].sort((a, b) =>
    (a.beneficialOwner!.legalName ?? "").localeCompare(
      b.beneficialOwner!.legalName ?? "",
    ),
  );
  return { taxYearLabel, computedAt: account.computedAt, account, owners };
}
