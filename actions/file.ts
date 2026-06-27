"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { assertValidUpload, normalizeMime } from "@/lib/uploads";

/**
 * Upload a document/receipt to DocumentStorage and record a FileObject. Can
 * optionally attach the file to a compliance document or a transaction.
 */
export async function uploadFileAction(formData: FormData) {
  const ctx = await getActiveContext();
  const { entityId } = ctx;
  const { user } = await requireEntityAccess(entityId, Capability.MANAGE_FILES);

  const file = formData.get("file");
  assertValidUpload(file);
  const mimeType = normalizeMime(file.type);
  const propertyId = (formData.get("propertyId") as string) || null;
  const complianceDocId = (formData.get("complianceDocId") as string) || null;
  const transactionId = (formData.get("transactionId") as string) || null;

  // Verify any referenced rows belong to the active account.
  if (propertyId) {
    const ok = await prisma.property.findFirst({
      where: { id: propertyId, accountId: entityId },
      select: { id: true },
    });
    if (!ok) throw new Error("Property not found");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const key = `${entityId}/${randomUUID()}-${safeName}`;
  const { sizeBytes } = await services.storage.put(key, bytes, mimeType);

  const record = await prisma.fileObject.create({
    data: {
      accountId: entityId,
      propertyId,
      filename: file.name,
      mimeType,
      sizeBytes,
      storageKey: key,
      uploadedByUserId: user.id,
    },
  });

  if (complianceDocId) {
    await prisma.document.updateMany({
      where: { id: complianceDocId, accountId: entityId },
      data: { fileId: record.id },
    });
  }
  if (transactionId) {
    await prisma.transaction.updateMany({
      where: { id: transactionId, accountId: entityId },
      data: { attachmentFileId: record.id },
    });
  }

  revalidatePath("/files");
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
  return { id: record.id, filename: record.filename };
}
