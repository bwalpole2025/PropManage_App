import { prisma } from "@/lib/db";

/** Beneficial owners for the account, with their current property holdings. */
export async function listOwnership(entityId: string) {
  return prisma.beneficialOwner.findMany({
    where: { accountId: entityId },
    include: {
      ownerships: {
        where: { effectiveTo: null },
        include: { property: { select: { addressLine1: true } } },
        orderBy: { ownershipPercentageBp: "desc" },
      },
    },
    orderBy: { legalName: "asc" },
  });
}

/** Limited companies for the account, with their linked-portfolio count. */
export async function listCompanies(entityId: string) {
  return prisma.company.findMany({
    where: { accountId: entityId },
    include: { _count: { select: { portfolios: true, beneficialOwners: true } } },
    orderBy: { name: "asc" },
  });
}

export interface OwnershipScreenOwner {
  id: string;
  legalName: string;
  type: string;
  companyId: string | null;
  shares: { propertyId: string; addressLine1: string; bp: number }[];
}

/**
 * Everything the Ownership screen needs: portfolios (with property + distinct
 * beneficial-owner counts), beneficial owners (with their per-property shares,
 * filtered/sorted), companies, summary counts and the filter options. Scoped by
 * accountId throughout.
 */
export async function getOwnershipScreen(
  entityId: string,
  opts: { property?: string; owner?: string; sort?: string } = {},
) {
  const [portfolios, companies, ownersRaw, propertyCounts, ownershipRows, properties] =
    await Promise.all([
      prisma.portfolio.findMany({
        where: { accountId: entityId },
        orderBy: { name: "asc" },
      }),
      listCompanies(entityId),
      prisma.beneficialOwner.findMany({
        where: { accountId: entityId },
        include: {
          ownerships: {
            where: { effectiveTo: null },
            include: { property: { select: { id: true, addressLine1: true } } },
            orderBy: { ownershipPercentageBp: "desc" },
          },
        },
        orderBy: { legalName: "asc" },
      }),
      prisma.property.groupBy({
        by: ["portfolioId"],
        where: { accountId: entityId },
        _count: { _all: true },
      }),
      prisma.propertyOwnership.findMany({
        // `archivedAt: null` so the per-portfolio owner count agrees with the
        // property count (which the soft-delete extension already excludes for
        // archived rows). The nested relation filter isn't auto-injected.
        where: {
          effectiveTo: null,
          property: { accountId: entityId, archivedAt: null },
        },
        select: {
          beneficialOwnerId: true,
          property: { select: { portfolioId: true } },
        },
      }),
      prisma.property.findMany({
        where: { accountId: entityId },
        select: { id: true, addressLine1: true },
        orderBy: { addressLine1: "asc" },
      }),
    ]);

  const propertyCountByPortfolio = new Map(
    propertyCounts.map((p) => [p.portfolioId, p._count._all]),
  );
  const ownerSetByPortfolio = new Map<string, Set<string>>();
  for (const row of ownershipRows) {
    const pid = row.property.portfolioId;
    const set = ownerSetByPortfolio.get(pid) ?? new Set<string>();
    set.add(row.beneficialOwnerId);
    ownerSetByPortfolio.set(pid, set);
  }

  const portfolioCards = portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    isDefault: p.isDefault,
    companyId: p.companyId,
    propertyCount: propertyCountByPortfolio.get(p.id) ?? 0,
    ownerCount: ownerSetByPortfolio.get(p.id)?.size ?? 0,
  }));

  let owners: OwnershipScreenOwner[] = ownersRaw.map((o) => ({
    id: o.id,
    legalName: o.legalName,
    type: o.type,
    companyId: o.companyId,
    shares: o.ownerships.map((ow) => ({
      propertyId: ow.property.id,
      addressLine1: ow.property.addressLine1,
      bp: ow.ownershipPercentageBp,
    })),
  }));

  if (opts.owner) owners = owners.filter((o) => o.id === opts.owner);
  if (opts.property)
    owners = owners.filter((o) =>
      o.shares.some((s) => s.propertyId === opts.property),
    );
  // Sort is Name A–Z (the only option); ownersRaw is already ordered by name.

  return {
    summary: {
      portfolioCount: portfolios.length,
      ownerCount: ownersRaw.length,
      companyCount: companies.length,
    },
    portfolios: portfolioCards,
    owners,
    companies,
    filterOptions: {
      properties,
      owners: ownersRaw.map((o) => ({ id: o.id, legalName: o.legalName })),
    },
  };
}
