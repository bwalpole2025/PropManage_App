import { prisma } from "@/lib/db";
import { taxYearEndDate, taxYearLabelFor, taxYearStartDate } from "@/lib/format";
import { TxnStatus } from "@/lib/enums";
import { isSa105Category } from "@/lib/sa105";
import type { TxnForEstimate } from "@/lib/tax";
import type { ApportionTxn } from "@/lib/ownership";

/** Entity record (incl. type) — used to branch tax treatment. */
export async function getEntity(entityId: string) {
  return prisma.account.findUniqueOrThrow({ where: { id: entityId } });
}

/**
 * The account's default ('Personal — Default') portfolio. Untracked items and
 * properties created without an explicit portfolio fall into this one. Falls
 * back to the first portfolio if no default is flagged.
 */
export async function getDefaultPortfolio(accountId: string) {
  const found = await prisma.portfolio.findFirst({
    where: { accountId, isDefault: true },
  });
  if (found) return found;
  return prisma.portfolio.findFirstOrThrow({
    where: { accountId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Transactions for an entity within a tax-year window, shaped for the tax
 * estimator. Excludes EXCLUDED transactions and any without a category.
 */
export async function getTaxYearTxns(
  entityId: string,
  taxYearLabel: string,
): Promise<TxnForEstimate[]> {
  const start = taxYearStartDate(taxYearLabel);
  const end = taxYearEndDate(taxYearLabel);
  const rows = await prisma.transaction.findMany({
    where: {
      accountId: entityId,
      date: { gte: start, lte: end },
      status: { not: TxnStatus.EXCLUDED },
      category: { not: null },
    },
    select: { direction: true, amountPence: true, category: true },
  });
  return rows
    .filter((r) => isSa105Category(r.category))
    .map((r) => ({
      direction: r.direction as TxnForEstimate["direction"],
      amountPence: r.amountPence,
      category: r.category as TxnForEstimate["category"],
    }));
}

/**
 * As `getTaxYearTxns`, but also carries `propertyId` so transactions can be
 * apportioned to beneficial owners for per-owner tax statements. Kept separate
 * so the account-level callers (dashboard, tax page, tRPC) are unaffected.
 */
export async function getTaxYearTxnsWithProperty(
  entityId: string,
  taxYearLabel: string,
): Promise<ApportionTxn[]> {
  const start = taxYearStartDate(taxYearLabel);
  const end = taxYearEndDate(taxYearLabel);
  const rows = await prisma.transaction.findMany({
    where: {
      accountId: entityId,
      date: { gte: start, lte: end },
      status: { not: TxnStatus.EXCLUDED },
      category: { not: null },
    },
    select: { propertyId: true, direction: true, amountPence: true, category: true },
  });
  return rows
    .filter((r) => isSa105Category(r.category))
    .map((r) => ({
      propertyId: r.propertyId,
      direction: r.direction as ApportionTxn["direction"],
      amountPence: r.amountPence,
      category: r.category as ApportionTxn["category"],
    }));
}

export { taxYearLabelFor };
