"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { createPropertyCore } from "@/actions/property";
import {
  propertyDedupKey,
  validatePropertyRow,
  type ParsedPropertyRow,
  type RawPropertyRow,
} from "@/lib/property-import-mapping";

export interface PropertyImportResult {
  created: number;
  duplicates: number;
  errors: { row: number; message: string }[];
}

/** Authoritative property import: re-validate, dedup by (address, postcode), create. */
export async function commitPropertyImportAction(
  rows: RawPropertyRow[],
): Promise<PropertyImportResult> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const result: PropertyImportResult = { created: 0, duplicates: 0, errors: [] };
  const valid: ParsedPropertyRow[] = [];
  for (const raw of rows) {
    const r = validatePropertyRow(raw);
    if (!r.ok || !r.value) {
      result.errors.push({
        row: raw.rowNumber,
        message: r.errors.map((e) => e.message).join("; "),
      });
      continue;
    }
    valid.push(r.value);
  }
  if (valid.length === 0) return result;

  const existing = await prisma.property.findMany({
    where: { accountId: entityId, archivedAt: null },
    select: { addressLine1: true, postcode: true },
  });
  const keys = new Set(existing.map(propertyDedupKey));
  const seen = new Set<string>();

  for (const v of valid) {
    const key = propertyDedupKey(v);
    if (keys.has(key) || seen.has(key)) {
      result.duplicates++;
      continue;
    }
    seen.add(key);
    await createPropertyCore(entityId, {
      addressLine1: v.addressLine1,
      addressLine2: v.addressLine2 ?? undefined,
      city: v.city,
      postcode: v.postcode,
      propertyType: v.propertyType,
      bedrooms: v.bedrooms ?? undefined,
    });
    result.created++;
  }

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  return result;
}
