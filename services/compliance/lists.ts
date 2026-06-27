// Read models for the compliance sub-pages (hazards, pets, registrations).

import { prisma } from "@/lib/db";
import { HazardStatus, PetRequestStatus, TenancyStatus } from "@/lib/enums";

export async function getHazards(accountId: string) {
  return prisma.hazardReport.findMany({
    where: { accountId },
    orderBy: [{ status: "asc" }, { reportedDate: "desc" }],
    select: {
      id: true,
      category: true,
      severity: true,
      status: true,
      reportedDate: true,
      reportedBy: true,
      description: true,
      investigateByDate: true,
      repairStartByDate: true,
      investigatedAt: true,
      resolvedAt: true,
      property: { select: { addressLine1: true } },
    },
  });
}
export type HazardRow = Awaited<ReturnType<typeof getHazards>>[number];

export async function getPetRequests(accountId: string) {
  return prisma.petRequest.findMany({
    where: { accountId },
    orderBy: [{ status: "asc" }, { requestedDate: "desc" }],
    select: {
      id: true,
      petDescription: true,
      status: true,
      requestedDate: true,
      responseDeadline: true,
      decidedAt: true,
      decisionReason: true,
      tenancy: {
        select: {
          property: { select: { addressLine1: true } },
          tenants: { where: { isLeadTenant: true }, take: 1, select: { name: true } },
        },
      },
    },
  });
}
export type PetRow = Awaited<ReturnType<typeof getPetRequests>>[number];

/** Pickers + inline-edit rows for forms across the compliance sub-pages. */
export async function getComplianceFormData(accountId: string) {
  const [properties, tenancies, registration] = await Promise.all([
    prisma.property.findMany({
      where: { accountId, archivedAt: null },
      orderBy: { addressLine1: "asc" },
      select: {
        id: true,
        addressLine1: true,
        prsdId: true,
        prsdStatus: true,
        prsdRegisteredDate: true,
      },
    }),
    prisma.tenancy.findMany({
      where: { status: TenancyStatus.ACTIVE, property: { accountId } },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        property: { select: { addressLine1: true } },
        tenants: {
          select: {
            id: true,
            name: true,
            rightToRentStatus: true,
            rightToRentExpiry: true,
          },
        },
      },
    }),
    prisma.landlordRegistration.findUnique({ where: { accountId } }),
  ]);

  return {
    properties: properties.map((p) => ({ id: p.id, label: p.addressLine1 })),
    propertiesPrsd: properties,
    tenancies: tenancies.map((t) => ({
      id: t.id,
      label: `${t.property.addressLine1} — ${t.tenants.find(Boolean)?.name ?? "Tenant"}`,
    })),
    tenants: tenancies.flatMap((t) =>
      t.tenants.map((tn) => ({
        id: tn.id,
        name: tn.name,
        propertyLabel: t.property.addressLine1,
        rightToRentStatus: tn.rightToRentStatus,
        rightToRentExpiry: tn.rightToRentExpiry,
      })),
    ),
    registration,
  };
}

export { HazardStatus, PetRequestStatus };
