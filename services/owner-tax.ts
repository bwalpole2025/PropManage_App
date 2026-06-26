import { prisma } from "@/lib/db";
import { LandlordType } from "@/lib/enums";
import { taxYearLabelFor } from "@/lib/format";
import { services } from "@/lib/services";
import {
  apportionTxnsByOwnership,
  type OwnerShare,
} from "@/lib/ownership";
import type { TaxBand, TaxEstimateResult } from "@/lib/tax";
import { getEntity, getTaxYearTxnsWithProperty } from "./shared";

export interface OwnerTaxEstimate {
  owner: { id: string; legalName: string; type: string };
  estimate: TaxEstimateResult;
  ownedPropertyCount: number;
}

/**
 * Per-beneficial-owner tax estimates for a tax year. Each property's
 * transactions are split pro-rata by ownership %, then the shared SA105
 * estimator runs on each owner's slice — so an owner with 50% of a property
 * sees exactly 50% of its taxable income and allowable expenses. Computed live;
 * not persisted. Every query is scoped by accountId.
 */
export async function getOwnerTaxEstimates(
  entityId: string,
  taxYearLabel: string | undefined,
  opts: { usePropertyAllowance?: boolean; taxBand?: TaxBand } = {},
) {
  const taxYear = taxYearLabel ?? taxYearLabelFor();
  const entity = await getEntity(entityId);

  const [txns, ownerships, owners] = await Promise.all([
    getTaxYearTxnsWithProperty(entityId, taxYear),
    prisma.propertyOwnership.findMany({
      where: { effectiveTo: null, property: { accountId: entityId } },
      select: {
        propertyId: true,
        beneficialOwnerId: true,
        ownershipPercentageBp: true,
      },
    }),
    prisma.beneficialOwner.findMany({
      where: { accountId: entityId },
      select: { id: true, legalName: true, type: true },
      orderBy: { legalName: "asc" },
    }),
  ]);

  // Map<propertyId, OwnerShare[]> and Map<ownerId, distinct propertyIds>.
  const byProperty = new Map<string, OwnerShare[]>();
  const ownerProperties = new Map<string, Set<string>>();
  for (const o of ownerships) {
    const list = byProperty.get(o.propertyId) ?? [];
    list.push({ beneficialOwnerId: o.beneficialOwnerId, bp: o.ownershipPercentageBp });
    byProperty.set(o.propertyId, list);
    const set = ownerProperties.get(o.beneficialOwnerId) ?? new Set<string>();
    set.add(o.propertyId);
    ownerProperties.set(o.beneficialOwnerId, set);
  }

  const byOwner = apportionTxnsByOwnership(txns, byProperty);

  const estimates: OwnerTaxEstimate[] = owners.map((owner) => {
    const ownerTxns = byOwner.get(owner.id) ?? [];
    const estimate = services.tax.estimate({
      entityId,
      taxYear,
      transactions: ownerTxns,
      options: {
        landlordType: entity.type as LandlordType,
        usePropertyAllowance: opts.usePropertyAllowance,
        taxBand: opts.taxBand,
      },
    });
    return {
      owner,
      estimate,
      ownedPropertyCount: ownerProperties.get(owner.id)?.size ?? 0,
    };
  });

  return { taxYear, owners: estimates };
}
