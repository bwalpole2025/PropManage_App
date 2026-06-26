import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { daysUntil } from "@/lib/format";
import {
  DocumentCategory,
  DocumentCategoryLabel,
  DEFAULT_REMINDER_OFFSETS_DAYS,
  ExpiryWindow,
  ExpiryWindowDays,
  ImportantDateKind,
  isBuiltinDocumentCategory,
} from "@/lib/enums";

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Create — the shared core used by the upload action AND tests. Creating a
// document with an expiry date materialises BOTH the per-offset scheduled
// reminders (DocumentReminder, 30/14/7/1) and a user-facing calendar entry
// (Reminder), so the new document shows on the Calendar/Reminders screens.
// ---------------------------------------------------------------------------

export interface CreateDocumentInput {
  category: string; // built-in DocumentCategory key OR a custom-category id
  propertyId?: string | null;
  tenancyId?: string | null;
  issuedDate?: Date | null;
  expiryDate?: Date | null;
  reference?: string | null;
  fileId?: string | null;
}

/**
 * Persist a document (account-scoped) with expiry reminders + a calendar entry.
 * Validates that any referenced property / tenancy / custom-category belong to
 * the account. Scheduled reminders honour the account's `complianceReminders`
 * notification preference; the calendar entry is always created when there is an
 * expiry date (it is a date, not a notification).
 */
export async function createDocument(
  entityId: string,
  input: CreateDocumentInput,
) {
  let propertyId = input.propertyId || null;
  const tenancyId = input.tenancyId || null;

  if (propertyId) {
    const ok = await prisma.property.findFirst({
      where: { id: propertyId, accountId: entityId },
      select: { id: true },
    });
    if (!ok) throw new Error("Property not found");
  }
  if (tenancyId) {
    const tenancy = await prisma.tenancy.findFirst({
      where: { id: tenancyId, property: { accountId: entityId } },
      select: { id: true, propertyId: true },
    });
    if (!tenancy) throw new Error("Tenancy not found");
    // Link the document's property to the tenancy's property when not given,
    // so the calendar entry is property-scoped too.
    if (!propertyId) propertyId = tenancy.propertyId;
  }

  // Resolve the category label for the calendar entry name; also validates that
  // a custom-category id actually belongs to this account.
  let label: string;
  if (isBuiltinDocumentCategory(input.category)) {
    label = DocumentCategoryLabel[input.category as DocumentCategory];
  } else {
    const custom = await prisma.documentCustomCategory.findFirst({
      where: { id: input.category, accountId: entityId },
      select: { name: true },
    });
    if (!custom) throw new Error("Unknown category");
    label = custom.name;
  }

  const expiry = input.expiryDate ?? null;
  const offsets = [...DEFAULT_REMINDER_OFFSETS_DAYS];

  // Always materialise the 30/14/7/1-day reminder rows when there's an expiry.
  // Whether each one is actually *delivered* (and on which channels) is decided
  // at fire time by the dispatcher against the account's current preferences —
  // so toggling `complianceReminders` later takes effect retroactively, and a
  // document created while reminders were off still nudges once they're on.
  return prisma.document.create({
    data: {
      accountId: entityId,
      propertyId,
      tenancyId,
      category: input.category,
      issuedDate: input.issuedDate ?? null,
      expiryDate: expiry,
      reference: input.reference || null,
      fileId: input.fileId || null,
      reminderOffsetsDays: expiry ? offsets : [],
      reminders: expiry
        ? {
            create: offsets.map((o) => ({
              offsetDays: o,
              fireOn: new Date(expiry.getTime() - o * DAY_MS),
            })),
          }
        : undefined,
      userReminders: expiry
        ? {
            create: [
              {
                accountId: entityId,
                propertyId,
                tenancyId,
                name: `${label} expires`,
                dueDate: expiry,
                kind: ImportantDateKind.CUSTOM,
              },
            ],
          }
        : undefined,
    },
    include: { reminders: true, userReminders: true },
  });
}

// ---------------------------------------------------------------------------
// Read — the Documents-area screen (tabs, filters, counts, selectors).
// ---------------------------------------------------------------------------

export interface DocumentFilters {
  tab?: string; // "documents" | "receipts"
  category?: string;
  expiry?: string; // ExpiryWindow
  propertyId?: string;
  portfolioId?: string;
  tenancyId?: string;
}

export type DocumentRow = Prisma.DocumentGetPayload<{
  include: {
    property: { select: { id: true; addressLine1: true; portfolioId: true } };
    tenancy: {
      select: {
        id: true;
        tenants: { select: { name: true } };
      };
    };
    file: { select: { id: true; filename: true; mimeType: true } };
  };
}>;

const documentInclude = {
  property: { select: { id: true, addressLine1: true, portfolioId: true } },
  tenancy: { select: { id: true, tenants: { select: { name: true } } } },
  file: { select: { id: true, filename: true, mimeType: true } },
} satisfies Prisma.DocumentInclude;

function expiryBuckets(expiries: Date[], now = new Date()) {
  const b = { expired: 0, d14: 0, d30: 0, d90: 0, valid: 0 };
  for (const e of expiries) {
    const d = daysUntil(e, now);
    if (d < 0) b.expired++;
    else if (d <= 14) b.d14++;
    else if (d <= 30) b.d30++;
    else if (d <= 90) b.d90++;
    else b.valid++;
  }
  return b;
}

export async function getDocumentsScreen(
  entityId: string,
  filters: DocumentFilters = {},
) {
  const now = new Date();
  const tab = filters.tab === "receipts" ? "receipts" : "documents";

  const where: Prisma.DocumentWhereInput = { accountId: entityId };
  if (filters.category) {
    where.category = filters.category;
  } else if (tab === "receipts") {
    where.category = DocumentCategory.RECEIPT;
  } else {
    where.category = { not: DocumentCategory.RECEIPT };
  }
  if (filters.expiry && filters.expiry !== ExpiryWindow.ANY) {
    const days = ExpiryWindowDays[filters.expiry as keyof typeof ExpiryWindowDays];
    if (days) {
      where.expiryDate = { not: null, lte: new Date(now.getTime() + days * DAY_MS) };
    }
  }
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.tenancyId) where.tenancyId = filters.tenancyId;
  if (filters.portfolioId) where.property = { portfolioId: filters.portfolioId };

  const [
    documents,
    documentsCount,
    receiptsCount,
    allExpiries,
    customCategories,
    categoryCounts,
    properties,
    portfolios,
    tenancies,
  ] = await Promise.all([
    prisma.document.findMany({
      where,
      include: documentInclude,
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
    prisma.document.count({
      where: { accountId: entityId, category: { not: DocumentCategory.RECEIPT } },
    }),
    prisma.document.count({
      where: { accountId: entityId, category: DocumentCategory.RECEIPT },
    }),
    prisma.document.findMany({
      where: { accountId: entityId, expiryDate: { not: null } },
      select: { expiryDate: true },
    }),
    prisma.documentCustomCategory.findMany({
      where: { accountId: entityId },
      orderBy: { name: "asc" },
    }),
    prisma.document.groupBy({
      by: ["category"],
      where: { accountId: entityId },
      _count: { _all: true },
    }),
    prisma.property.findMany({
      where: { accountId: entityId, archivedAt: null },
      select: { id: true, addressLine1: true, portfolioId: true },
      orderBy: { addressLine1: "asc" },
    }),
    prisma.portfolio.findMany({
      where: { accountId: entityId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenancy.findMany({
      where: { property: { accountId: entityId }, archivedAt: null },
      select: {
        id: true,
        property: { select: { addressLine1: true } },
        tenants: {
          where: { isLeadTenant: true },
          take: 1,
          select: { name: true },
        },
      },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const countByCategory: Record<string, number> = {};
  for (const c of categoryCounts) countByCategory[c.category] = c._count._all;

  return {
    tab,
    documents,
    counts: { documents: documentsCount, receipts: receiptsCount },
    buckets: expiryBuckets(
      allExpiries.map((e) => e.expiryDate!),
      now,
    ),
    customCategories: customCategories.map((c) => ({
      ...c,
      documentCount: countByCategory[c.id] ?? 0,
    })),
    customNames: Object.fromEntries(
      customCategories.map((c) => [c.id, c.name]),
    ) as Record<string, string>,
    countByCategory,
    properties,
    portfolios,
    tenancies: tenancies.map((t) => ({
      id: t.id,
      label: `${t.tenants[0]?.name ?? "Tenant"} · ${t.property.addressLine1}`,
    })),
  };
}

/** id → name map of an account's custom categories (for label resolution). */
export async function getCustomCategoryNames(
  entityId: string,
): Promise<Record<string, string>> {
  const rows = await prisma.documentCustomCategory.findMany({
    where: { accountId: entityId },
    select: { id: true, name: true },
  });
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

/** Flat rows for the Reports CSV export. */
export async function listDocumentsForExport(entityId: string) {
  const [docs, names] = await Promise.all([
    prisma.document.findMany({
      where: { accountId: entityId },
      include: {
        property: { select: { addressLine1: true } },
        file: { select: { filename: true } },
      },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
    }),
    getCustomCategoryNames(entityId),
  ]);
  return { docs, names };
}
