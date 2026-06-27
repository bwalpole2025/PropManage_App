"use server";
import { toClientError } from "@/lib/errors";

import { prisma, type PrismaTx } from "@/lib/db";
import {
  parseMoneyOptional,
  parseRentDueDay,
} from "@/lib/tenancy-parse";
import { RentFrequency, TenancyStatus } from "@/lib/enums";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { syncRentSchedule } from "@/services/rent-schedule";
import { revalidateTenancy } from "@/lib/tenancy-revalidate";
import { tenancyUpdateSchema } from "@/schemas/tenancy";
import type { TenancyActionState } from "@/actions/property";

/**
 * Edit a tenancy. Empty fields are left unchanged. When a rent-affecting field
 * changes (rent / frequency / due day / start / end / status→ENDED) the rent
 * schedule is re-synced (future unmatched entries regenerated; reconciled/past
 * preserved) and nextPaymentDate refreshed. IDOR-guarded via property.accountId.
 */
export async function updateTenancyAction(
  tenancyId: string,
  _prev: TenancyActionState,
  formData: FormData,
): Promise<TenancyActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

    const tenancy = await prisma.tenancy.findFirst({
      where: { id: tenancyId, property: { accountId: entityId } },
      include: { tenants: { where: { isLeadTenant: true }, take: 1 } },
    });
    if (!tenancy) return { error: "Tenancy not found" };

    const parsed = tenancyUpdateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const d = parsed.data;

    // Resolve the final value of each field (new if provided, else existing).
    const newRentPence = parseMoneyOptional("Rent", d.rent);
    const rentPence = newRentPence ?? tenancy.rentPence;
    const rentFrequency = d.rentFrequency ?? (tenancy.rentFrequency as RentFrequency);
    const parsedDueDay = parseRentDueDay(d.rentDueDay);
    const rentDueDay = parsedDueDay === undefined ? tenancy.rentDueDay : parsedDueDay;
    const startDate = d.startDate?.trim() ? new Date(d.startDate) : tenancy.startDate;
    let endDate =
      d.endDate !== undefined
        ? d.endDate.trim()
          ? new Date(d.endDate)
          : null
        : tenancy.endDate;
    const depositPence = parseMoneyOptional("Deposit", d.deposit);
    const status = d.status ?? (tenancy.status as TenancyStatus);
    // Ending without an explicit end date ends today (so the card isn't "Ongoing"
    // and future rent stops generating).
    if (status === TenancyStatus.ENDED && !endDate) endDate = new Date();

    const rentAffecting =
      (newRentPence !== undefined && newRentPence !== tenancy.rentPence) ||
      rentFrequency !== tenancy.rentFrequency ||
      rentDueDay !== tenancy.rentDueDay ||
      startDate.getTime() !== tenancy.startDate.getTime() ||
      (endDate?.getTime() ?? null) !== (tenancy.endDate?.getTime() ?? null) ||
      status !== tenancy.status;

    await prisma.$transaction(async (tx: PrismaTx) => {
      await tx.tenancy.update({
        where: { id: tenancyId },
        data: {
          rentPence,
          rentFrequency,
          rentDueDay,
          startDate,
          endDate,
          status,
          ...(depositPence !== undefined ? { depositPence } : {}),
          ...(d.depositScheme ? { depositScheme: d.depositScheme } : {}),
        },
      });

      const lead = tenancy.tenants[0];
      if (lead && (d.tenantName?.trim() || d.tenantEmail !== undefined)) {
        await tx.tenant.update({
          where: { id: lead.id },
          data: {
            ...(d.tenantName?.trim() ? { name: d.tenantName.trim() } : {}),
            ...(d.tenantEmail !== undefined
              ? { email: d.tenantEmail.trim() || null }
              : {}),
          },
        });
      }

      if (rentAffecting) {
        const nextPaymentDate = await syncRentSchedule(tx, tenancyId, {
          startDate,
          endDate,
          rentFrequency,
          rentDueDay,
          rentPence,
        });
        await tx.tenancy.update({
          where: { id: tenancyId },
          data: { nextPaymentDate },
        });
      }
    });

    revalidateTenancy(tenancy.propertyId);
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: toClientError(e) };
  }
}
