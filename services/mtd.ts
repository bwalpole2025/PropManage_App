import { prisma } from "@/lib/db";
import { taxYearLabelFor } from "@/lib/format";
import { services } from "@/lib/services";
import { computeTaxEstimate, type TxnForEstimate } from "@/lib/tax";
import { isSa105Category } from "@/lib/sa105";
import { TxnStatus, SubmissionStatus, MtdStatus } from "@/lib/enums";
import type { PropertyIncomeSummary } from "@/lib/services/types";

/** The MtdConnection row for an account (or null). */
export async function getMtdConnection(entityId: string) {
  return prisma.mtdConnection.findUnique({ where: { accountId: entityId } });
}

/** Categorised, SA105-mappable transactions in a period [from, to]. */
async function getPeriodTxns(
  entityId: string,
  from: Date,
  to: Date,
): Promise<TxnForEstimate[]> {
  // The obligation endDate is a midnight boundary; include the WHOLE last day by
  // using an exclusive upper bound at the start of the next day (so a txn at
  // 5 Jul 14:00 isn't dropped).
  const toExclusive = new Date(to);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const rows = await prisma.transaction.findMany({
    where: {
      accountId: entityId,
      date: { gte: from, lt: toExclusive },
      status: { not: TxnStatus.EXCLUDED },
      category: { not: null },
    },
    select: { direction: true, amountPence: true, category: true },
  });
  return rows
    .filter((r) => isSa105Category(r.category))
    .map((r) => ({
      direction: r.direction as TxnForEstimate["direction"],
      amountPence: r.amountPence,
      category: r.category as TxnForEstimate["category"],
    }));
}

/**
 * Compile the SA105-aligned period summary HMRC expects, from the account's
 * CATEGORISED transactions in the period. This is the figure the user reviews
 * and confirms before it is submitted.
 */
export async function compilePeriodSummary(input: {
  entityId: string;
  taxYear: string;
  periodKey: string;
  from: Date;
  to: Date;
}): Promise<PropertyIncomeSummary> {
  const txns = await getPeriodTxns(input.entityId, input.from, input.to);
  const estimate = computeTaxEstimate(input.taxYear, txns, {});
  const summary = services.tax.toPropertyIncomeSummary(estimate);
  summary.periodKey = input.periodKey;
  return summary;
}

/** The latest persisted HMRC calculation for a tax year (or null). */
export async function getLatestCalculation(entityId: string, taxYear: string) {
  const conn = await getMtdConnection(entityId);
  if (!conn) return null;
  return prisma.mtdCalculation.findFirst({
    where: { mtdConnectionId: conn.id, taxYearLabel: taxYear },
    orderBy: { updatedAt: "desc" },
  });
}

export interface MtdOverview {
  taxYear: string;
  mode: string;
  status: string;
  connected: boolean;
  expiresAt: Date | null;
  nino: string | null;
  businessId: string | null;
  obligations: {
    periodKey: string;
    startDate: string;
    endDate: string;
    dueDate: string;
    type: string;
    status: "OPEN" | "FULFILLED";
  }[];
  submissions: {
    id: string;
    type: string;
    periodKey: string | null;
    status: string;
    hmrcReceiptId: string | null;
    submittedAt: Date | null;
    submittedByUserId: string | null;
    createdAt: Date;
  }[];
  calculation: Awaited<ReturnType<typeof getLatestCalculation>>;
}

/** Everything the MTD screen renders for the active account. */
export async function getMtdOverview(
  entityId: string,
  taxYearLabel?: string,
): Promise<MtdOverview> {
  const taxYear = taxYearLabel ?? taxYearLabelFor();
  const connection = await getMtdConnection(entityId);
  const connected = connection?.status === MtdStatus.CONNECTED;

  // Obligations come from HMRC (behind the interface). Overlay FULFILLED state
  // from our own ACCEPTED submissions so the screen reflects what we filed.
  const hmrcObligations = connected
    ? await services.hmrc.getObligations({ entityId, taxYear })
    : [];
  const accepted = connection
    ? await prisma.mtdSubmission.findMany({
        where: {
          mtdConnectionId: connection.id,
          status: SubmissionStatus.ACCEPTED,
          taxYearLabel: taxYear,
        },
        select: { periodKey: true, type: true },
      })
    : [];
  // Quarterly updates match by periodKey; the Final Declaration obligation has no
  // periodKey on the submission, so match it by type for this tax year.
  const acceptedKeys = new Set(
    accepted.map((s) => s.periodKey).filter((k): k is string => !!k),
  );
  const finalAccepted = accepted.some((s) => s.type === "FINAL_DECLARATION");
  const obligations = hmrcObligations.map((o) => {
    const fulfilled =
      o.type === "FINAL_DECLARATION" ? finalAccepted : acceptedKeys.has(o.periodKey);
    return { ...o, status: fulfilled ? ("FULFILLED" as const) : o.status };
  });

  const submissions = connection
    ? await prisma.mtdSubmission.findMany({
        where: { mtdConnectionId: connection.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          periodKey: true,
          status: true,
          hmrcReceiptId: true,
          submittedAt: true,
          submittedByUserId: true,
          createdAt: true,
        },
      })
    : [];

  return {
    taxYear,
    mode: services.hmrc.mode,
    status: connection?.status ?? MtdStatus.NOT_CONNECTED,
    connected,
    expiresAt: connection?.expiresAt ?? null,
    nino: connection?.nino ?? null,
    businessId: connection?.businessIncomeSourceId ?? null,
    obligations,
    submissions,
    calculation: await getLatestCalculation(entityId, taxYear),
  };
}
