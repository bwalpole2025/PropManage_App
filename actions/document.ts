"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { createDocument } from "@/services/documents";
import { assertValidUpload, normalizeMime } from "@/lib/uploads";
import { toClientError } from "@/lib/errors";
import { documentUploadSchema, customCategorySchema } from "@/schemas/document";

export type DocumentActionState = { ok?: boolean; error?: string; at?: number };

function revalidateDocuments(propertyId?: string | null) {
  revalidatePath("/files/documents");
  revalidatePath("/files/calendar");
  revalidatePath("/files/reminders");
  revalidatePath("/dashboard");
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
}

/**
 * Upload a new document/receipt. Optionally stores the attached file, then
 * records the Document and (when an expiry date is given) its scheduled
 * reminders + calendar entry via `createDocument`.
 */
export async function uploadDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  try {
    const { entityId } = await getActiveContext();
    const { user } = await requireEntityAccess(entityId, Capability.MANAGE_FILES);

    const parsed = documentUploadSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid document" };
    }
    const d = parsed.data;

    // Optional attachment → FileObject (mock storage in local dev).
    let fileId: string | null = null;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      assertValidUpload(file);
      const bytes = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const key = `${entityId}/${randomUUID()}-${safeName}`;
      const mimeType = normalizeMime(file.type);
      const { sizeBytes } = await services.storage.put(key, bytes, mimeType);
      const rec = await prisma.fileObject.create({
        data: {
          accountId: entityId,
          propertyId: d.propertyId || null,
          filename: file.name,
          mimeType,
          sizeBytes,
          storageKey: key,
          uploadedByUserId: user.id,
        },
      });
      fileId = rec.id;
    }

    await createDocument(entityId, {
      category: d.category,
      propertyId: d.propertyId || null,
      tenancyId: d.tenancyId || null,
      issuedDate: d.issuedDate ? new Date(d.issuedDate) : null,
      expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
      reference: d.reference || null,
      fileId,
    });

    revalidateDocuments(d.propertyId || null);
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: toClientError(e) };
  }
}

export async function addCustomCategoryAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_FILES);

    const parsed = customCategorySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
    }

    try {
      await prisma.documentCustomCategory.create({
        data: { accountId: entityId, name: parsed.data.name },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return { error: "A category with that name already exists" };
      }
      throw e;
    }

    revalidatePath("/files/documents");
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: toClientError(e) };
  }
}

/** Delete a custom category. Blocked while documents still reference it. */
export async function deleteCustomCategoryAction(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_FILES);

    const cat = await prisma.documentCustomCategory.findFirst({
      where: { id, accountId: entityId },
      select: { id: true },
    });
    if (!cat) return { error: "Category not found" };

    const inUse = await prisma.document.count({
      where: { accountId: entityId, category: id },
    });
    if (inUse > 0) {
      return { error: `Still used by ${inUse} document${inUse === 1 ? "" : "s"}` };
    }

    await prisma.documentCustomCategory.delete({ where: { id } });
    revalidatePath("/files/documents");
    return { ok: true };
  } catch (e) {
    return { error: toClientError(e) };
  }
}
