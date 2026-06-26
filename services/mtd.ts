import { prisma } from "@/lib/db";
import { taxYearLabelFor } from "@/lib/format";
import { services } from "@/lib/services";
import { SubscriptionStatus } from "@/lib/enums";

/**
 * Full MTD functionality (connecting to HMRC, submitting updates) is gated to an
 * ACTIVE subscription. Education + prerequisites stay visible to everyone.
 */
export function mtdFullAccess(
  subscriptionStatus: string | null | undefined,
): boolean {
  return subscriptionStatus === SubscriptionStatus.ACTIVE;
}

export async function getMtdOverview(entityId: string) {
  const taxYear = taxYearLabelFor();
  const [connection, account] = await Promise.all([
    prisma.mtdConnection.findUnique({ where: { accountId: entityId } }),
    prisma.account.findUnique({
      where: { id: entityId },
      select: { subscriptionStatus: true },
    }),
  ]);

  // Obligations come from the (mock) HMRC service behind the clean interface.
  const obligations = await services.hmrc.getObligations({ entityId, taxYear });
  const subscriptionStatus = account?.subscriptionStatus ?? "active";

  return {
    taxYear,
    connected: connection?.status === "CONNECTED",
    businessId: connection?.businessIncomeSourceId ?? null,
    obligations,
    mode: services.hmrc.mode,
    subscriptionStatus,
    hasFullAccess: mtdFullAccess(subscriptionStatus),
  };
}
