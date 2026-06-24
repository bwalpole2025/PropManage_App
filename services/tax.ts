import { LandlordType } from "@/lib/enums";
import { recentTaxYears, taxYearLabelFor } from "@/lib/format";
import { services } from "@/lib/services";
import type { TaxBand } from "@/lib/tax";
import { getEntity, getTaxYearTxns } from "./shared";

export async function getTaxEstimate(
  entityId: string,
  taxYearLabel: string | undefined,
  opts: { usePropertyAllowance?: boolean; taxBand?: TaxBand } = {},
) {
  const taxYear = taxYearLabel ?? taxYearLabelFor();
  const entity = await getEntity(entityId);
  const transactions = await getTaxYearTxns(entityId, taxYear);

  const estimate = services.tax.estimate({
    entityId,
    taxYear,
    transactions,
    options: {
      landlordType: entity.type as LandlordType,
      usePropertyAllowance: opts.usePropertyAllowance,
      taxBand: opts.taxBand,
    },
  });

  const summary = services.tax.toPropertyIncomeSummary(estimate);

  return {
    entity,
    estimate,
    summary,
    taxYear,
    availableYears: recentTaxYears(4),
    txnCount: transactions.length,
  };
}
