import { prisma } from "@/lib/db";

/** Account-wide notes, newest first (raw Note rows — used by older callers). */
export async function listNotes(entityId: string) {
  return prisma.note.findMany({
    where: { accountId: entityId },
    include: {
      property: { select: { addressLine1: true } },
      tenant: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });
}

export interface NoteFilters {
  propertyId?: string;
  tenantId?: string;
}

export type NoteSource = "property" | "tenant" | "transaction";

export interface NoteRow {
  id: string;
  source: NoteSource;
  linkedToLabel: string;
  description: string;
  date: Date;
  propertyId: string | null;
  tenantId: string | null;
}

/**
 * The Notes screen — aggregates notes created against a property or a tenant
 * (Note rows) plus free-text notes on transactions, into one filterable list.
 * Transaction notes aren't tenant-linked, so a tenant filter excludes them.
 */
export async function getNotesScreen(
  entityId: string,
  filters: NoteFilters = {},
) {
  const [notes, txns, properties, tenants] = await Promise.all([
    prisma.note.findMany({
      where: {
        accountId: entityId,
        ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
        ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      },
      include: {
        property: { select: { addressLine1: true } },
        tenant: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
    filters.tenantId
      ? Promise.resolve(
          [] as {
            id: string;
            notes: string | null;
            date: Date;
            description: string;
            propertyId: string | null;
            property: { addressLine1: string } | null;
          }[],
        )
      : prisma.transaction.findMany({
          where: {
            accountId: entityId,
            notes: { not: null },
            ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
          },
          select: {
            id: true,
            notes: true,
            date: true,
            description: true,
            propertyId: true,
            property: { select: { addressLine1: true } },
          },
          orderBy: { date: "desc" },
        }),
    prisma.property.findMany({
      where: { accountId: entityId, archivedAt: null },
      select: { id: true, addressLine1: true },
      orderBy: { addressLine1: "asc" },
    }),
    prisma.tenant.findMany({
      where: { tenancy: { property: { accountId: entityId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: NoteRow[] = [];
  for (const n of notes) {
    rows.push({
      id: `note-${n.id}`,
      source: n.tenantId ? "tenant" : "property",
      linkedToLabel:
        n.property?.addressLine1 ?? n.tenant?.name ?? "Account-wide",
      description: n.description,
      date: n.date,
      propertyId: n.propertyId,
      tenantId: n.tenantId,
    });
  }
  for (const t of txns) {
    if (!t.notes || !t.notes.trim()) continue;
    rows.push({
      id: `txn-${t.id}`,
      source: "transaction",
      linkedToLabel: t.property?.addressLine1
        ? `${t.property.addressLine1} · ${t.description}`
        : `Transaction · ${t.description}`,
      description: t.notes,
      date: t.date,
      propertyId: t.propertyId,
      tenantId: null,
    });
  }
  rows.sort((a, b) => b.date.getTime() - a.date.getTime());

  return { rows, properties, tenants };
}
