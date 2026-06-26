// Pure ownership apportionment (no prisma) — splits a property's transactions
// between its beneficial owners pro-rata by ownership percentage, so the tax
// estimator can produce a per-owner statement. Unit-tested in isolation.

import type { TxnForEstimate } from "./tax";

export interface ApportionTxn {
  propertyId: string | null;
  direction: TxnForEstimate["direction"];
  amountPence: number;
  category: TxnForEstimate["category"];
}

export interface OwnerShare {
  beneficialOwnerId: string;
  bp: number; // basis points, 0..10000 (5000 = 50%)
}

/**
 * Split each property-linked transaction pro-rata by ownership %. Returns a map
 * of `beneficialOwnerId → that owner's slice of transactions` (shaped for the
 * tax estimator).
 *
 * - Untracked transactions (`propertyId == null` → the default portfolio) are
 *   skipped: with no property there is no ownership to derive, so they stay
 *   account-level only.
 * - A property with no recorded owners is skipped (its figures aren't attributed
 *   to anyone).
 * - Shares are NOT normalised: each owner gets `round(amount * bp / 10000)`
 *   independently. If a property's active bp sum is < 10000 the remainder is
 *   simply unattributed; > 10000 is blocked at write time (see
 *   `validateOwnershipTotalBp`).
 */
export function apportionTxnsByOwnership(
  txns: ApportionTxn[],
  ownershipByProperty: Map<string, OwnerShare[]>,
): Map<string, TxnForEstimate[]> {
  const byOwner = new Map<string, TxnForEstimate[]>();
  for (const t of txns) {
    if (!t.propertyId) continue;
    const shares = ownershipByProperty.get(t.propertyId);
    if (!shares || shares.length === 0) continue;
    for (const s of shares) {
      const slice = Math.round((t.amountPence * s.bp) / 10000);
      if (slice === 0) continue;
      let arr = byOwner.get(s.beneficialOwnerId);
      if (!arr) {
        arr = [];
        byOwner.set(s.beneficialOwnerId, arr);
      }
      arr.push({
        direction: t.direction,
        amountPence: slice,
        category: t.category,
      });
    }
  }
  return byOwner;
}

/**
 * Validate a proposed ownership assignment for one property. `existingOthersBp`
 * is the sum of the OTHER owners' current active shares (excluding the owner
 * being assigned). Rejects out-of-range percentages and any total over 100%.
 */
export function validateOwnershipTotalBp(
  existingOthersBp: number,
  newBp: number,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(newBp) || newBp < 1 || newBp > 10000) {
    return { ok: false, error: "Percentage must be between 0.01% and 100%" };
  }
  if (existingOthersBp + newBp > 10000) {
    const remaining = Math.max(0, 10000 - existingOthersBp);
    return {
      ok: false,
      error: `Total ownership would exceed 100% — only ${(remaining / 100).toFixed(2)}% available on this property`,
    };
  }
  return { ok: true };
}
