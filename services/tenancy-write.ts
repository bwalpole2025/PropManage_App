import { prisma, type PrismaTx } from "@/lib/db";
import {
  TenancyAgreementType,
  TenancyStatus,
  type DepositScheme,
  type RentFrequency,
} from "@/lib/enums";
import { syncRentSchedule } from "@/services/rent-schedule";

export interface CreateTenancyInput {
  propertyId: string;
  tenantName: string;
  tenantEmail?: string | null;
  rentPence: number;
  rentFrequency: RentFrequency;
  rentDueDay?: number | null;
  startDate: Date;
  endDate?: Date | null;
  depositPence?: number | null;
  depositScheme?: DepositScheme | null;
}

/**
 * Shared tenancy persistence (a plain service, NOT a server action — so it's
 * never exposed as a client-callable endpoint): create the tenancy + lead
 * tenant, generate the expected-rent schedule, and store nextPaymentDate. Used
 * by the create action, the dialog state action, and the spreadsheet importer.
 * IDOR: verifies the property belongs to the account.
 */
export async function createTenancyCore(
  entityId: string,
  input: CreateTenancyInput,
) {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, accountId: entityId },
    select: { id: true },
  });
  if (!property) throw new Error("Property not found");

  // A tenancy whose end date is already in the past is created ENDED (so an
  // imported historical tenancy doesn't pollute occupancy / active widgets).
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endMs = input.endDate
    ? Date.UTC(
        input.endDate.getUTCFullYear(),
        input.endDate.getUTCMonth(),
        input.endDate.getUTCDate(),
      )
    : null;
  const status =
    endMs !== null && endMs < todayMs ? TenancyStatus.ENDED : TenancyStatus.ACTIVE;
  // A past-dated end (historical import) is a pre-RRA fixed term; otherwise the
  // RRA default applies. The user-facing create action additionally hard-blocks
  // any end date, so a LEGACY_FIXED only ever originates from the importer.
  const agreementType =
    input.endDate && status === TenancyStatus.ENDED
      ? TenancyAgreementType.LEGACY_FIXED
      : TenancyAgreementType.ASSURED_PERIODIC;

  return prisma.$transaction(async (tx: PrismaTx) => {
    const tenancy = await tx.tenancy.create({
      data: {
        propertyId: input.propertyId,
        status,
        agreementType,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        rentPence: input.rentPence,
        rentFrequency: input.rentFrequency,
        rentDueDay: input.rentDueDay ?? null,
        depositPence: input.depositPence ?? null,
        depositScheme: input.depositScheme ?? null,
        tenants: {
          create: {
            name: input.tenantName,
            email: input.tenantEmail || null,
            isLeadTenant: true,
          },
        },
      },
    });
    const nextPaymentDate = await syncRentSchedule(
      tx,
      tenancy.id,
      {
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        rentFrequency: input.rentFrequency,
        rentDueDay: input.rentDueDay ?? null,
        rentPence: input.rentPence,
      },
      now,
    );
    await tx.tenancy.update({
      where: { id: tenancy.id },
      data: { nextPaymentDate },
    });
    return tenancy;
  });
}
