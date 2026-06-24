import { prisma } from "@/lib/db";
import { taxYearEndDate, taxYearLabelFor, taxYearStartDate } from "@/lib/format";
import { TxnStatus } from "@/lib/enums";
import { isSa105Category } from "@/lib/sa105";
import type { TxnForEstimate } from "@/lib/tax";

/** Entity record (incl. type) — used to branch tax treatment. */
export async function getEntity(entityId: string) {
  return prisma.landlordEntity.findUniqueOrThrow({ where: { id: entityId } });
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
      landlordEntityId: entityId,
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

export { taxYearLabelFor };
