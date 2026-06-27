"use server";
import { toClientError } from "@/lib/errors";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { poundsToPence } from "@/lib/format";
import { TxnSource, TxnStatus } from "@/lib/enums";
import { Sa105Category } from "@/lib/sa105";
import { allCategoryDirection, isKnownCategory, type AllCategory } from "@/lib/categories";
import { matchRentPayment, unmatchRentPayment } from "@/lib/rent-matching";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { recordAudit, AuditAction } from "@/lib/audit";

const RENT = Sa105Category.RENT_INCOME;

/** Fields needed to (un)match a rent payment against the rent schedule. */
const TXN_MATCH_SELECT = {
  id: true,
  category: true,
  status: true,
  propertyId: true,
  tenancyId: true,
  amountPence: true,
  rentDueDate: true,
} satisfies Prisma.TransactionSelect;

/** Revalidate every surface a categorise/link/arrears change can touch. */
function revalidateAfterTxn(propertyId?: string | null) {
  revalidatePath("/transactions");
  revalidatePath("/tax");
  revalidatePath("/dashboard");
  revalidatePath("/properties");
  if (propertyId) revalidatePath(`/properties/${propertyId}/tenancies`);
}

const createSchema = z.object({
  category: z.string().min(1, "Choose a category"),
  amount: z.string().min(1, "Enter an amount"),
  date: z.string().min(1, "Pick a date"),
  description: z.string().min(1, "Add a description"),
  propertyId: z.string().optional(),
  tenancyId: z.string().optional(),
  merchant: z.string().optional(),
  subcategory: z.string().optional(),
  notes: z.string().optional(),
});

async function assertTenancy(entityId: string, tenancyId: string) {
  const t = await prisma.tenancy.findFirst({
    where: { id: tenancyId, property: { accountId: entityId } },
    select: { id: true },
  });
  if (!t) throw new Error("Tenancy not found");
}

/** Shared create logic for both the full-page form and the inline dialog. */
async function createTransactionFromForm(
  entityId: string,
  formData: FormData,
  actorUserId: string,
) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid transaction");
  }
  const d = parsed.data;
  if (!isKnownCategory(d.category)) throw new Error("Unknown category");
  const direction = allCategoryDirection[d.category];

  if (d.propertyId) {
    const prop = await prisma.property.findFirst({
      where: { id: d.propertyId, accountId: entityId },
      select: { id: true },
    });
    if (!prop) throw new Error("Property not found");
  }
  if (d.tenancyId) await assertTenancy(entityId, d.tenancyId);

  const created = await prisma.transaction.create({
    data: {
      accountId: entityId,
      propertyId: d.propertyId || null,
      tenancyId: d.tenancyId || null,
      direction,
      amountPence: poundsToPence(d.amount),
      date: new Date(d.date),
      description: d.description,
      merchant: d.merchant || null,
      category: d.category,
      subcategory: d.subcategory || null,
      notes: d.notes || null,
      source: TxnSource.MANUAL,
      status: TxnStatus.RECONCILED,
    },
    select: TXN_MATCH_SELECT,
  });

  if (d.category === RENT) {
    await prisma.$transaction(async (tx) => {
      const res = await matchRentPayment(tx, created);
      if (res) {
        await tx.transaction.update({
          where: { id: created.id },
          data: {
            tenancyId: res.tenancyId,
            ...(res.dueDate ? { rentDueDate: res.dueDate } : {}),
          },
        });
      }
    });
  }

  await recordAudit({
    accountId: entityId,
    actorUserId,
    action: AuditAction.TRANSACTION_CREATE,
    targetType: "Transaction",
    targetId: created.id,
    metadata: {
      category: created.category,
      amountPence: created.amountPence,
      propertyId: created.propertyId,
    },
  });

  revalidateAfterTxn(created.propertyId);
}

export async function createTransactionAction(formData: FormData) {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  await createTransactionFromForm(entityId, formData, user.id);
  redirect("/transactions");
}

export interface AddTransactionState {
  ok?: boolean;
  error?: string;
}

/** Non-redirecting create for the inline dialog — the client closes + refreshes. */
export async function addTransactionAction(
  _prev: AddTransactionState,
  formData: FormData,
): Promise<AddTransactionState> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  try {
    await createTransactionFromForm(entityId, formData, user.id);
  } catch (e) {
    return { error: toClientError(e) };
  }
  return { ok: true };
}

/**
 * Set or change a transaction's category (+ optional subcategory and tenancy).
 * Categorising as rent links the tenancy and clears the matching arrears entry;
 * moving away from rent reverses any previous match.
 */
export async function categoriseTransactionAction(
  transactionId: string,
  category: string,
  subcategory?: string | null,
  tenancyId?: string | null,
) {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  if (!isKnownCategory(category)) throw new Error("Unknown category");
  if (tenancyId) await assertTenancy(entityId, tenancyId);

  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId: entityId },
    select: TXN_MATCH_SELECT,
  });
  if (!txn) throw new Error("Transaction not found");

  const wasRent = txn.category === RENT;
  const isRent = category === RENT;
  const active = txn.status !== TxnStatus.EXCLUDED;

  await prisma.$transaction(async (tx) => {
    // Reverse any existing match first, then re-apply — handles rent→rent edits
    // (tenancy/property change) cleanly without double-counting.
    if (wasRent) await unmatchRentPayment(tx, txn.id, txn.amountPence);
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        category,
        subcategory: subcategory ?? null,
        direction: allCategoryDirection[category],
        ...(tenancyId !== undefined ? { tenancyId: tenancyId || null } : {}),
      },
    });
    if (isRent && active) {
      const res = await matchRentPayment(tx, {
        ...txn,
        tenancyId: tenancyId ?? txn.tenancyId,
      });
      if (res) {
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            tenancyId: res.tenancyId,
            ...(res.dueDate ? { rentDueDate: res.dueDate } : {}),
          },
        });
      }
    }
  });

  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.TRANSACTION_CATEGORISE,
    targetType: "Transaction",
    targetId: transactionId,
    metadata: { from: txn.category, to: category, subcategory: subcategory ?? null },
  });

  revalidateAfterTxn(txn.propertyId);
}

export interface TxnPatch {
  category?: string | null;
  subcategory?: string | null;
  propertyId?: string | null;
  tenancyId?: string | null;
  notes?: string | null;
}

/** Richer single-transaction edit used by the detail dialog. */
export async function updateTransactionAction(
  transactionId: string,
  patch: TxnPatch,
): Promise<{ ok: boolean }> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  if (patch.category != null && !isKnownCategory(patch.category)) {
    throw new Error("Unknown category");
  }
  if (patch.propertyId) {
    const prop = await prisma.property.findFirst({
      where: { id: patch.propertyId, accountId: entityId },
      select: { id: true },
    });
    if (!prop) throw new Error("Property not found");
  }
  if (patch.tenancyId) await assertTenancy(entityId, patch.tenancyId);

  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId: entityId },
    select: TXN_MATCH_SELECT,
  });
  if (!txn) throw new Error("Transaction not found");

  const newCategory =
    patch.category !== undefined ? patch.category : txn.category;
  const wasRent = txn.category === RENT;
  const isRent = newCategory === RENT;
  const propertyId =
    patch.propertyId !== undefined ? patch.propertyId : txn.propertyId;
  const tenancyId =
    patch.tenancyId !== undefined ? patch.tenancyId : txn.tenancyId;

  const active = txn.status !== TxnStatus.EXCLUDED;

  await prisma.$transaction(async (tx) => {
    // Reverse any existing match, then re-apply against the (possibly new)
    // property/tenancy so a rent→rent reassignment can't double-count.
    if (wasRent) await unmatchRentPayment(tx, txn.id, txn.amountPence);
    const data: Prisma.TransactionUncheckedUpdateInput = {};
    if (patch.category !== undefined) {
      data.category = patch.category;
      if (patch.category) {
        data.direction = allCategoryDirection[patch.category as AllCategory];
      }
    }
    if (patch.subcategory !== undefined) data.subcategory = patch.subcategory || null;
    if (patch.propertyId !== undefined) data.propertyId = patch.propertyId || null;
    if (patch.tenancyId !== undefined) data.tenancyId = patch.tenancyId || null;
    if (patch.notes !== undefined) data.notes = patch.notes || null;
    await tx.transaction.update({ where: { id: transactionId }, data });

    if (isRent && active) {
      const res = await matchRentPayment(tx, {
        id: txn.id,
        amountPence: txn.amountPence,
        propertyId,
        tenancyId,
        rentDueDate: txn.rentDueDate,
      });
      if (res) {
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            tenancyId: res.tenancyId,
            ...(res.dueDate ? { rentDueDate: res.dueDate } : {}),
          },
        });
      }
    }
  });

  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.TRANSACTION_UPDATE,
    targetType: "Transaction",
    targetId: transactionId,
    metadata: { patch },
  });

  revalidateAfterTxn(propertyId ?? txn.propertyId);
  return { ok: true };
}

export async function setTransactionNotesAction(
  transactionId: string,
  notes: string,
): Promise<{ ok: boolean }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  const r = await prisma.transaction.updateMany({
    where: { id: transactionId, accountId: entityId },
    data: { notes: notes || null },
  });
  if (r.count === 0) throw new Error("Transaction not found");
  revalidatePath("/transactions");
  return { ok: true };
}

/** Deactivate (exclude) a transaction from the books — reverses any rent match. */
export async function excludeTransactionAction(transactionId: string) {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId: entityId },
    select: { id: true, category: true, amountPence: true, propertyId: true },
  });
  if (!txn) throw new Error("Transaction not found");

  await prisma.$transaction(async (tx) => {
    if (txn.category === RENT) await unmatchRentPayment(tx, txn.id, txn.amountPence);
    await tx.transaction.update({
      where: { id: transactionId },
      data: { status: TxnStatus.EXCLUDED },
    });
  });
  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.TRANSACTION_EXCLUDE,
    targetType: "Transaction",
    targetId: transactionId,
    metadata: { amountPence: txn.amountPence },
  });
  revalidateAfterTxn(txn.propertyId);
}

/** Reactivate an excluded transaction — re-applies a rent match if applicable. */
export async function restoreTransactionAction(transactionId: string) {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId: entityId },
    select: { ...TXN_MATCH_SELECT, bankTransactionId: true },
  });
  if (!txn) throw new Error("Transaction not found");
  const status = txn.bankTransactionId
    ? TxnStatus.RECONCILED
    : TxnStatus.UNRECONCILED;

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transactionId },
      data: { status },
    });
    if (txn.category === RENT) {
      const res = await matchRentPayment(tx, txn);
      if (res) {
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            tenancyId: res.tenancyId,
            ...(res.dueDate ? { rentDueDate: res.dueDate } : {}),
          },
        });
      }
    }
  });
  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.TRANSACTION_RESTORE,
    targetType: "Transaction",
    targetId: transactionId,
  });
  revalidateAfterTxn(txn.propertyId);
}

/** Mark an unreconciled bank-feed transaction as reconciled. */
export async function reconcileTransactionAction(transactionId: string) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId: entityId },
    select: { id: true },
  });
  if (!txn) throw new Error("Transaction not found");

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: TxnStatus.RECONCILED },
  });

  revalidatePath("/transactions/reconcile");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// ---- Bulk operations (selected ids) -------------------------------------

async function selectedTxns(entityId: string, ids: string[], extraWhere = {}) {
  return prisma.transaction.findMany({
    where: { id: { in: ids }, accountId: entityId, ...extraWhere },
    select: TXN_MATCH_SELECT,
  });
}

export async function bulkRecategoriseTransactionsAction(
  ids: string[],
  category: string,
  subcategory?: string | null,
): Promise<{ count: number }> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  if (!isKnownCategory(category)) throw new Error("Unknown category");
  if (!ids.length) return { count: 0 };
  const txns = await selectedTxns(entityId, ids);

  await prisma.$transaction(async (tx) => {
    for (const t of txns) {
      if (t.category === RENT) await unmatchRentPayment(tx, t.id, t.amountPence);
      await tx.transaction.update({
        where: { id: t.id },
        data: {
          category,
          subcategory: subcategory ?? null,
          direction: allCategoryDirection[category],
        },
      });
      if (category === RENT && t.status !== TxnStatus.EXCLUDED) {
        const res = await matchRentPayment(tx, t);
        if (res) {
          await tx.transaction.update({
            where: { id: t.id },
            data: {
              tenancyId: res.tenancyId,
              ...(res.dueDate ? { rentDueDate: res.dueDate } : {}),
            },
          });
        }
      }
    }
  });
  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.TRANSACTION_BULK,
    metadata: { op: "recategorise", count: txns.length, category },
  });
  revalidateAfterTxn();
  return { count: txns.length };
}

export async function bulkExcludeSelectedAction(
  ids: string[],
): Promise<{ count: number }> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  if (!ids.length) return { count: 0 };
  const txns = await selectedTxns(entityId, ids);
  await prisma.$transaction(async (tx) => {
    for (const t of txns) {
      if (t.category === RENT) await unmatchRentPayment(tx, t.id, t.amountPence);
      await tx.transaction.update({
        where: { id: t.id },
        data: { status: TxnStatus.EXCLUDED },
      });
    }
  });
  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.TRANSACTION_BULK,
    metadata: { op: "exclude", count: txns.length },
  });
  revalidateAfterTxn();
  return { count: txns.length };
}

/** Unlink selected bank-feed transactions from their bank match. */
export async function bulkUnlinkSelectedAction(
  ids: string[],
): Promise<{ count: number }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  if (!ids.length) return { count: 0 };
  const txns = await selectedTxns(entityId, ids, { source: TxnSource.BANK_FEED });
  await prisma.$transaction(async (tx) => {
    for (const t of txns) {
      if (t.category === RENT) await unmatchRentPayment(tx, t.id, t.amountPence);
      await tx.transaction.update({
        where: { id: t.id },
        data: { bankTransactionId: null, status: TxnStatus.UNRECONCILED },
      });
    }
  });
  revalidateAfterTxn();
  return { count: txns.length };
}
