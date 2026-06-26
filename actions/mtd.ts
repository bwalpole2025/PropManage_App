"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import {
  MtdStatus,
  SubmissionType,
  ObligationStatus,
  MembershipRole,
} from "@/lib/enums";
import { taxYearLabelFor } from "@/lib/format";
import { mintState } from "@/lib/mtd/state";
import { buildFraudHeaders, type FraudClientHints } from "@/lib/mtd/fraudHeaders";
import {
  MTD_REDIRECT_PATH,
  SUBMISSION_TYPE_EOPS,
  CalcStatus,
  CalcKind,
} from "@/lib/mtd/constants";
import {
  recordPendingSubmission,
  finalizeSubmission,
  recordError,
  assertNotAlreadyAccepted,
} from "@/lib/mtd/audit";
import { compilePeriodSummary } from "@/services/mtd";
import type { AgentContext } from "@/lib/services/types";

function revalidate() {
  revalidatePath("/mtd");
}

/** Cast a JSON-serializable value for Prisma Json columns. */
const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

/** Client-collected fraud-prevention hints (screen/window/timezone) from the form. */
export interface ClientHints {
  screens?: string;
  windowSize?: string;
  timezone?: string;
}

interface Actor {
  userId: string;
  role: string;
  membershipId: string;
  agentContext: AgentContext;
}

/** Resolve who is acting + assert the capability; builds the delegated agent context. */
async function actor(entityId: string, capability: Capability): Promise<Actor> {
  const { user } = await requireEntityAccess(entityId, capability);
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { userId_accountId: { userId: user.id, accountId: entityId } },
    select: { id: true, role: true },
  });
  return {
    userId: user.id,
    role: membership.role,
    membershipId: membership.id,
    agentContext: {
      submittedByUserId: user.id,
      submittedByMembershipId: membership.id,
      onBehalfOf: membership.role === MembershipRole.ACCOUNTANT ? "agent" : "self",
    },
  };
}

/** Build fraud-prevention headers from the request + client hints. */
async function fraud(
  hints: ClientHints | undefined,
  deviceId: string | null,
  agentContext: AgentContext,
): Promise<Record<string, string>> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientHints: FraudClientHints = {
    publicIp: fwd || undefined,
    userAgent: h.get("user-agent") ?? undefined,
    timezone: hints?.timezone,
    screens: hints?.screens,
    windowSize: hints?.windowSize,
    deviceId: deviceId ?? undefined,
  };
  return buildFraudHeaders(clientHints, agentContext);
}

async function absoluteCallbackUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${MTD_REDIRECT_PATH}`;
}

// ---------------------------------------------------------------------------
// 1. Authorise (OAuth) + connection management
// ---------------------------------------------------------------------------

/** Begin the OAuth flow: mint a signed state, persist its nonce, return the authorize URL. */
export async function startMtdAuthAction(): Promise<{ url: string }> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.SUBMIT_MTD);

  const { state, nonce } = mintState({ entityId, userId: user.id });
  await prisma.mtdConnection.upsert({
    where: { accountId: entityId },
    create: {
      accountId: entityId,
      oauthState: nonce,
      deviceId: randomUUID(),
      status: MtdStatus.NOT_CONNECTED,
    },
    update: { oauthState: nonce },
  });

  const url = services.hmrc.getAuthorizationUrl({
    entityId,
    redirectUri: await absoluteCallbackUrl(),
    state,
  });
  return { url };
}

const NINO_RE = /^[A-Z]{2}\d{6}[A-D]$/;

/** Save the user's National Insurance number (required for every ITSA call). */
export async function saveNinoAction(nino: string): Promise<{ ok?: boolean; error?: string }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.SUBMIT_MTD);
  const clean = nino.replace(/\s/g, "").toUpperCase();
  if (!NINO_RE.test(clean)) {
    return { error: "Enter a valid National Insurance number, e.g. QQ123456C." };
  }
  await prisma.mtdConnection.upsert({
    where: { accountId: entityId },
    create: { accountId: entityId, nino: clean, status: MtdStatus.NOT_CONNECTED },
    update: { nino: clean },
  });
  revalidate();
  return { ok: true };
}

/** Refresh the access token (extends the connection). */
export async function refreshMtdTokensAction(): Promise<{ ok?: boolean; error?: string }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.SUBMIT_MTD);
  try {
    await services.hmrc.refreshTokens(entityId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Disconnect: clear stored tokens and mark not connected (no further filing). */
export async function disconnectMtdAction(): Promise<{ ok: boolean }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.SUBMIT_MTD);
  await prisma.mtdConnection.update({
    where: { accountId: entityId },
    data: {
      status: MtdStatus.NOT_CONNECTED,
      accessTokenEnc: null,
      refreshTokenEnc: null,
      oauthState: null,
    },
  });
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 2. Income sources + obligations
// ---------------------------------------------------------------------------

/** Pull income sources + obligations from HMRC and persist them locally. */
export async function refreshObligationsAction(
  taxYearLabel?: string,
): Promise<{ ok?: boolean; count?: number; error?: string }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.SUBMIT_MTD);
  const taxYear = taxYearLabel ?? taxYearLabelFor();
  const conn = await prisma.mtdConnection.findUnique({ where: { accountId: entityId } });
  if (!conn || conn.status !== MtdStatus.CONNECTED) {
    return { error: "Connect to HMRC first." };
  }
  try {
    // Ensure a business income source is selected.
    if (!conn.businessIncomeSourceId) {
      const sources = await services.hmrc.listIncomeSources({ entityId });
      const property =
        sources.find((s) => s.typeOfBusiness === "uk-property") ?? sources[0];
      if (property) {
        await prisma.mtdConnection.update({
          where: { id: conn.id },
          data: { businessIncomeSourceId: property.businessId },
        });
      }
    }

    const obligations = await services.hmrc.getObligations({ entityId, taxYear });
    for (const o of obligations) {
      await prisma.mtdObligation.upsert({
        where: { mtdConnectionId_periodKey: { mtdConnectionId: conn.id, periodKey: o.periodKey } },
        create: {
          mtdConnectionId: conn.id,
          periodKey: o.periodKey,
          startDate: new Date(o.startDate),
          endDate: new Date(o.endDate),
          dueDate: new Date(o.dueDate),
          type: o.type,
          status: o.status,
        },
        update: { dueDate: new Date(o.dueDate), status: o.status },
      });
    }
    revalidate();
    return { ok: true, count: obligations.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// 3. Submissions (each requires explicit confirmation + is fully audited)
// ---------------------------------------------------------------------------

const CONFIRM_TOKEN = "SUBMIT";

interface SubmitResult {
  ok?: boolean;
  receiptId?: string;
  status?: string;
  error?: string;
}

/** Submit a quarterly update for a period. Compiles the figure, confirms, files, audits. */
export async function submitQuarterlyUpdateAction(input: {
  periodKey: string;
  taxYear?: string;
  confirm: string;
  clientHints?: ClientHints;
}): Promise<SubmitResult> {
  const { entityId } = await getActiveContext();
  const who = await actor(entityId, Capability.SUBMIT_MTD);
  if (input.confirm !== CONFIRM_TOKEN) {
    return { error: "Type SUBMIT to confirm this filing to HMRC." };
  }
  const taxYear = input.taxYear ?? taxYearLabelFor();
  const conn = await prisma.mtdConnection.findUnique({ where: { accountId: entityId } });
  if (!conn || conn.status !== MtdStatus.CONNECTED) return { error: "Connect to HMRC first." };

  const obligations = await services.hmrc.getObligations({ entityId, taxYear });
  const obl = obligations.find((o) => o.periodKey === input.periodKey);
  if (!obl) return { error: "That period is not a current obligation." };

  await assertNotAlreadyAccepted({
    mtdConnectionId: conn.id,
    type: SubmissionType.QUARTERLY_UPDATE,
    periodKey: input.periodKey,
    taxYearLabel: taxYear,
  }).catch((e) => {
    throw e;
  });

  const summary = await compilePeriodSummary({
    entityId,
    taxYear,
    periodKey: input.periodKey,
    from: new Date(obl.startDate),
    to: new Date(obl.endDate),
  });

  const obligationRow = await prisma.mtdObligation.upsert({
    where: { mtdConnectionId_periodKey: { mtdConnectionId: conn.id, periodKey: input.periodKey } },
    create: {
      mtdConnectionId: conn.id,
      periodKey: input.periodKey,
      startDate: new Date(obl.startDate),
      endDate: new Date(obl.endDate),
      dueDate: new Date(obl.dueDate),
      type: obl.type,
    },
    update: {},
    select: { id: true },
  });

  const submissionId = await recordPendingSubmission({
    mtdConnectionId: conn.id,
    obligationId: obligationRow.id,
    type: SubmissionType.QUARTERLY_UPDATE,
    periodKey: input.periodKey,
    taxYearLabel: taxYear,
    payload: json(summary),
    submittedByUserId: who.userId,
    submittedByMembershipId: who.membershipId,
  });

  try {
    const result = await services.hmrc.submitQuarterlyUpdate({
      entityId,
      periodKey: input.periodKey,
      summary,
      agentContext: who.agentContext,
      fraudHeaders: await fraud(input.clientHints, conn.deviceId, who.agentContext),
    });
    await finalizeSubmission(submissionId, {
      hmrcReceiptId: result.receiptId,
      receiptJson: json(result),
      status: result.status,
    });
    await prisma.mtdObligation.update({
      where: { id: obligationRow.id },
      data: { status: ObligationStatus.FULFILLED },
    });
    revalidate();
    return { ok: true, receiptId: result.receiptId, status: result.status };
  } catch (e) {
    await recordError(submissionId, { message: (e as Error).message });
    revalidate();
    return { error: (e as Error).message };
  }
}

/** Submit the End-of-Period Statement for a business + tax year. */
export async function submitEopsAction(input: {
  taxYear?: string;
  confirm: string;
  clientHints?: ClientHints;
}): Promise<SubmitResult> {
  const { entityId } = await getActiveContext();
  const who = await actor(entityId, Capability.SUBMIT_MTD);
  if (input.confirm !== CONFIRM_TOKEN) return { error: "Type SUBMIT to confirm." };
  const taxYear = input.taxYear ?? taxYearLabelFor();
  const conn = await prisma.mtdConnection.findUnique({ where: { accountId: entityId } });
  if (!conn || conn.status !== MtdStatus.CONNECTED) return { error: "Connect to HMRC first." };
  if (!conn.businessIncomeSourceId) return { error: "No business income source selected." };

  await assertNotAlreadyAccepted({
    mtdConnectionId: conn.id,
    type: SUBMISSION_TYPE_EOPS,
    taxYearLabel: taxYear,
  });

  const submissionId = await recordPendingSubmission({
    mtdConnectionId: conn.id,
    type: SUBMISSION_TYPE_EOPS,
    taxYearLabel: taxYear,
    payload: { businessId: conn.businessIncomeSourceId, taxYear },
    submittedByUserId: who.userId,
    submittedByMembershipId: who.membershipId,
  });
  try {
    const result = await services.hmrc.submitEops({
      entityId,
      taxYear,
      businessId: conn.businessIncomeSourceId,
      agentContext: who.agentContext,
      fraudHeaders: await fraud(input.clientHints, conn.deviceId, who.agentContext),
    });
    await finalizeSubmission(submissionId, {
      hmrcReceiptId: result.receiptId,
      receiptJson: json(result),
      status: result.status,
    });
    revalidate();
    return { ok: true, receiptId: result.receiptId, status: result.status };
  } catch (e) {
    await recordError(submissionId, { message: (e as Error).message });
    revalidate();
    return { error: (e as Error).message };
  }
}

/** Submit the Final Declaration (crystallisation) for a tax year. */
export async function submitFinalDeclarationAction(input: {
  taxYear?: string;
  calculationId: string;
  confirm: string;
  clientHints?: ClientHints;
}): Promise<SubmitResult> {
  const { entityId } = await getActiveContext();
  const who = await actor(entityId, Capability.SUBMIT_MTD);
  if (input.confirm !== CONFIRM_TOKEN) return { error: "Type SUBMIT to confirm." };
  const taxYear = input.taxYear ?? taxYearLabelFor();
  const conn = await prisma.mtdConnection.findUnique({ where: { accountId: entityId } });
  if (!conn || conn.status !== MtdStatus.CONNECTED) return { error: "Connect to HMRC first." };

  await assertNotAlreadyAccepted({
    mtdConnectionId: conn.id,
    type: SubmissionType.FINAL_DECLARATION,
    taxYearLabel: taxYear,
  });

  const submissionId = await recordPendingSubmission({
    mtdConnectionId: conn.id,
    type: SubmissionType.FINAL_DECLARATION,
    taxYearLabel: taxYear,
    payload: { calculationId: input.calculationId, taxYear },
    submittedByUserId: who.userId,
    submittedByMembershipId: who.membershipId,
  });
  try {
    const result = await services.hmrc.submitFinalDeclaration({
      entityId,
      taxYear,
      calculationId: input.calculationId,
      agentContext: who.agentContext,
      fraudHeaders: await fraud(input.clientHints, conn.deviceId, who.agentContext),
    });
    await finalizeSubmission(submissionId, {
      hmrcReceiptId: result.receiptId,
      receiptJson: json(result),
      calculationId: input.calculationId,
      status: result.status,
    });
    revalidate();
    return { ok: true, receiptId: result.receiptId, status: result.status };
  } catch (e) {
    await recordError(submissionId, { message: (e as Error).message });
    revalidate();
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// 4. Calculation (trigger + poll). Not a filing — gated on RUN_TAX.
// ---------------------------------------------------------------------------

export async function triggerCalculationAction(input: {
  taxYear?: string;
  finalDeclaration?: boolean;
}): Promise<{ calculationId?: string; error?: string }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.RUN_TAX);
  const taxYear = input.taxYear ?? taxYearLabelFor();
  const conn = await prisma.mtdConnection.findUnique({ where: { accountId: entityId } });
  if (!conn || conn.status !== MtdStatus.CONNECTED) return { error: "Connect to HMRC first." };
  try {
    const { calculationId } = await services.hmrc.triggerCalculation({
      entityId,
      taxYear,
      calculationType: input.finalDeclaration ? "final-declaration" : "in-year",
    });
    await prisma.mtdCalculation.upsert({
      where: { calculationId },
      create: {
        mtdConnectionId: conn.id,
        taxYearLabel: taxYear,
        calculationId,
        status: CalcStatus.PENDING,
        kind: input.finalDeclaration ? CalcKind.CRYSTALLISED : CalcKind.ESTIMATE,
      },
      update: { status: CalcStatus.PENDING },
    });
    revalidate();
    return { calculationId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface CalculationView {
  calculationId: string;
  status: "PENDING" | "READY" | "ERROR";
  estimateOrCrystallised: "estimate" | "crystallised";
  totalIncomePence?: number;
  totalAllowancesAndDeductionsPence?: number;
  totalTaxableIncomePence?: number;
  incomeTaxAndNicsDuePence?: number;
}

export async function getCalculationAction(input: {
  calculationId: string;
  taxYear?: string;
}): Promise<{ calculation?: CalculationView; error?: string }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.RUN_TAX);
  const taxYear = input.taxYear ?? taxYearLabelFor();
  const conn = await prisma.mtdConnection.findUnique({ where: { accountId: entityId } });
  if (!conn) return { error: "Not connected." };
  try {
    const calc = await services.hmrc.getCalculation({
      entityId,
      taxYear,
      calculationId: input.calculationId,
    });
    if (calc.status === "READY") {
      await prisma.mtdCalculation
        .update({
          where: { calculationId: calc.calculationId },
          data: {
            status: CalcStatus.READY,
            totalIncomePence: calc.totalIncomePence ?? null,
            totalAllowancesAndDeductionsPence: calc.totalAllowancesAndDeductionsPence ?? null,
            totalTaxableIncomePence: calc.totalTaxableIncomePence ?? null,
            incomeTaxAndNicsDuePence: calc.incomeTaxAndNicsDuePence ?? null,
            resultJson: json(calc),
          },
        })
        .catch(() => {});
    }
    revalidate();
    return {
      calculation: {
        calculationId: calc.calculationId,
        status: calc.status,
        estimateOrCrystallised: calc.estimateOrCrystallised,
        totalIncomePence: calc.totalIncomePence,
        totalAllowancesAndDeductionsPence: calc.totalAllowancesAndDeductionsPence,
        totalTaxableIncomePence: calc.totalTaxableIncomePence,
        incomeTaxAndNicsDuePence: calc.incomeTaxAndNicsDuePence,
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
