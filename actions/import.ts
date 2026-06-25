"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TxnSource, TxnStatus } from "@/lib/enums";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import {
  dedupKey,
  validateRow,
  type ParsedRow,
  type RawImportRow,
  type ValidateContext,
} from "@/lib/import-mapping";

export interface CommitResult {
  created: number;
  duplicates: number;
  errors: { row: number; message: string }[];
}

function mapRow(v: ParsedRow): Omit<Prisma.TransactionCreateManyInput, "accountId"> {
  return {
    propertyId: v.propertyId,
    tenancyId: v.tenancyId,
    direction: v.direction,
    amountPence: v.amountPence,
    date: v.date,
    description: v.description,
    merchant: v.merchant,
    category: v.category,
    notes: v.notes,
    source: TxnSource.IMPORTED,
    status: TxnStatus.UNRECONCILED,
  };
}

/**
 * Authoritative import commit: re-validate every row, dedup against existing
 * transactions (by natural key) and within the batch (advisory — overridable),
 * then create the survivors. Receipts (uploaded client-side via uploadFileAction)
 * are linked per row.
 */
export async function commitImportAction(
  rows: RawImportRow[],
  opts: { allowDuplicates?: boolean } = {},
): Promise<CommitResult> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  const [properties, tenancies] = await Promise.all([
    prisma.property.findMany({
      where: { accountId: entityId, archivedAt: null },
      select: { id: true, addressLine1: true },
    }),
    prisma.tenancy.findMany({
      where: { property: { accountId: entityId }, status: "ACTIVE" },
      select: {
        id: true,
        property: { select: { addressLine1: true } },
        tenants: { where: { isLeadTenant: true }, select: { name: true }, take: 1 },
      },
    }),
  ]);
  const ctx: ValidateContext = {
    properties,
    tenancies: tenancies.map((t) => ({
      id: t.id,
      label: `${t.tenants[0]?.name ?? "Tenant"} · ${t.property.addressLine1}`,
    })),
  };

  const result: CommitResult = { created: 0, duplicates: 0, errors: [] };
  const valid: ParsedRow[] = [];
  for (const raw of rows) {
    const r = validateRow(raw, ctx);
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

  // Dedup against existing transactions within the import's date window.
  const times = valid.map((v) => v.date.getTime());
  const from = new Date(Math.min(...times));
  const to = new Date(Math.max(...times) + 86_400_000);
  const existing = await prisma.transaction.findMany({
    where: { accountId: entityId, date: { gte: from, lte: to } },
    select: {
      date: true,
      amountPence: true,
      description: true,
      propertyId: true,
      tenancyId: true,
      merchant: true,
    },
  });
  const existingKeys = new Set(existing.map((e) => dedupKey(e)));

  const seen = new Set<string>();
  const bulk: Prisma.TransactionCreateManyInput[] = [];
  for (const v of valid) {
    const key = dedupKey(v);
    const isDup = existingKeys.has(key) || seen.has(key);
    if (isDup && !(opts.allowDuplicates || v.allowDuplicate)) {
      result.duplicates++;
      continue;
    }
    seen.add(key);
    if (v.receiptFileId) {
      await prisma.transaction.create({
        data: { accountId: entityId, attachmentFileId: v.receiptFileId, ...mapRow(v) },
      });
    } else {
      bulk.push({ accountId: entityId, ...mapRow(v) });
    }
    result.created++;
  }

  if (bulk.length > 0) {
    await prisma.transaction.createMany({ data: bulk });
  }

  revalidatePath("/transactions");
  revalidatePath("/tax");
  revalidatePath("/dashboard");
  return result;
}
