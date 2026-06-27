"use server";
import { toClientError } from "@/lib/errors";

import { prisma } from "@/lib/db";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { createTenancyCore } from "@/services/tenancy-write";
import { revalidateTenancy } from "@/lib/tenancy-revalidate";
import {
  validateTenancyRow,
  tenancyDedupKey,
  type RawTenancyRow,
  type ParsedTenancyRow,
} from "@/lib/tenancy-import-mapping";

export interface TenancyImportResult {
  created: number;
  duplicates: number;
  errors: { row: number; message: string }[];
}

/**
 * Authoritative tenancy import: re-validate against the account's properties,
 * dedup by (property, lead tenant, start date), and create via createTenancyCore
 * (so each imported tenancy also generates its rent schedule).
 */
export async function commitTenancyImportAction(
  rows: RawTenancyRow[],
): Promise<TenancyImportResult> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const properties = await prisma.property.findMany({
    where: { accountId: entityId, archivedAt: null },
    select: { id: true, addressLine1: true, postcode: true },
  });

  const result: TenancyImportResult = { created: 0, duplicates: 0, errors: [] };
  const valid: ParsedTenancyRow[] = [];
  for (const raw of rows) {
    const r = validateTenancyRow(raw, { properties });
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

  const existing = await prisma.tenancy.findMany({
    where: { property: { accountId: entityId }, archivedAt: null },
    select: {
      propertyId: true,
      startDate: true,
      tenants: { where: { isLeadTenant: true }, take: 1, select: { name: true } },
    },
  });
  const keys = new Set(
    existing.map((t) =>
      tenancyDedupKey({
        propertyId: t.propertyId,
        tenantName: t.tenants[0]?.name ?? "",
        startDate: t.startDate,
      }),
    ),
  );
  const seen = new Set<string>();

  for (const v of valid) {
    const key = tenancyDedupKey(v);
    if (keys.has(key) || seen.has(key)) {
      result.duplicates++;
      continue;
    }
    seen.add(key);
    // Best-effort: a single bad row shouldn't abort the whole import.
    try {
      await createTenancyCore(entityId, {
        propertyId: v.propertyId,
        tenantName: v.tenantName,
        tenantEmail: v.tenantEmail,
        rentPence: v.rentPence,
        rentFrequency: v.rentFrequency,
        rentDueDay: v.rentDueDay,
        startDate: v.startDate,
        endDate: v.endDate,
        depositPence: v.depositPence,
        depositScheme: null,
      });
      result.created++;
    } catch (e) {
      result.errors.push({ row: v.rowNumber, message: toClientError(e) });
    }
  }

  revalidateTenancy();
  return result;
}
