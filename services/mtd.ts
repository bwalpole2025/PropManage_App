import { prisma } from "@/lib/db";
import { taxYearLabelFor } from "@/lib/format";
import { services } from "@/lib/services";

export async function getMtdOverview(entityId: string) {
  const taxYear = taxYearLabelFor();
  const connection = await prisma.mtdConnection.findUnique({
    where: { accountId: entityId },
  });

  // Obligations come from the (mock) HMRC service behind the clean interface.
  const obligations = await services.hmrc.getObligations({ entityId, taxYear });

  return {
    taxYear,
    connected: connection?.status === "CONNECTED",
    businessId: connection?.businessIncomeSourceId ?? null,
    obligations,
    mode: services.hmrc.mode,
  };
}
