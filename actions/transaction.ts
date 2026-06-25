"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { poundsToPence } from "@/lib/format";
import { TxnSource, TxnStatus } from "@/lib/enums";
import { Sa105CategoryDirection, isSa105Category } from "@/lib/sa105";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";

const createSchema = z.object({
  category: z.string().min(1, "Choose a category"),
  amount: z.string().min(1, "Enter an amount"),
  date: z.string().min(1, "Pick a date"),
  description: z.string().min(1, "Add a description"),
  propertyId: z.string().optional(),
  merchant: z.string().optional(),
});

/** Shared create logic for both the full-page form and the inline dialog. */
async function createTransactionFromForm(entityId: string, formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid transaction");
  }
  const d = parsed.data;
  if (!isSa105Category(d.category)) throw new Error("Unknown category");
  const direction = Sa105CategoryDirection[d.category];

  // If a property is supplied, ensure it belongs to the entity.
  if (d.propertyId) {
    const prop = await prisma.property.findFirst({
      where: { id: d.propertyId, accountId: entityId },
      select: { id: true },
    });
    if (!prop) throw new Error("Property not found");
  }

  await prisma.transaction.create({
    data: {
      accountId: entityId,
      propertyId: d.propertyId || null,
      direction,
      amountPence: poundsToPence(d.amount),
      date: new Date(d.date),
      description: d.description,
      merchant: d.merchant || null,
      category: d.category,
      source: TxnSource.MANUAL,
      status: TxnStatus.RECONCILED,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/tax");
  revalidatePath("/dashboard");
}

export async function createTransactionAction(formData: FormData) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  await createTransactionFromForm(entityId, formData);
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
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  try {
    await createTransactionFromForm(entityId, formData);
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: true };
}

/** Set or change a transaction's SA105 category (and matching direction). */
export async function categoriseTransactionAction(
  transactionId: string,
  category: string,
) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  if (!isSa105Category(category)) throw new Error("Unknown category");

  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId: entityId },
    select: { id: true },
  });
  if (!txn) throw new Error("Transaction not found");

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      category,
      direction: Sa105CategoryDirection[category],
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/tax");
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
