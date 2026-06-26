// Real HMRC MTD-for-IT adapter. Talks to the HMRC sandbox (or production) over
// OAuth2 + the Self Assessment / Business APIs. Selected by HMRC_MTD_MODE=hmrc
// outside development. NOT run in CI (no sandbox creds) but must be code-complete
// and type-safe. Pence<->pounds conversion lives ONLY here.

import { prisma } from "../../db";
import { encryptToken, decryptToken } from "../../crypto";
import { MtdStatus } from "../../enums";
import { buildFraudHeaders } from "../../mtd/fraudHeaders";
import { toHmrcMoney, fromHmrcMoney } from "../../mtd/money";
import {
  BUSINESS_TYPE_PATH,
  HMRC_ACCEPT,
  HMRC_AUTHORIZE_URL,
  HMRC_TOKEN_PATH,
  MTD_SCOPES,
  taxYearToFromTo,
} from "../../mtd/constants";
import type {
  BissDTO,
  HmrcMtdService,
  MtdCalculationDTO,
  MtdIncomeSourceDTO,
  MtdObligationDTO,
  PropertyIncomeSummary,
} from "../types";

/** A parsed HMRC error envelope ({code,message,errors[]}), surfaced to the user. */
export class HmrcApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly hmrcCode?: string,
    readonly subErrors?: { code: string; message: string }[],
  ) {
    super(message);
    this.name = "HmrcApiError";
  }
}

const toPounds = toHmrcMoney;
const fromPounds = fromHmrcMoney;

export class RealHmrcMtdService implements HmrcMtdService {
  readonly mode = "hmrc";

  private baseUrl = process.env.HMRC_BASE_URL ?? "https://test-api.service.hmrc.gov.uk";
  private clientId = process.env.HMRC_CLIENT_ID ?? "";
  private clientSecret = process.env.HMRC_CLIENT_SECRET ?? "";

  // -------------------------------------------------------------------------
  // OAuth
  // -------------------------------------------------------------------------

  getAuthorizationUrl(input: {
    entityId: string;
    redirectUri: string;
    state: string;
  }): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: MTD_SCOPES.join(" "),
      state: input.state,
      redirect_uri: input.redirectUri,
    });
    return `${HMRC_AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(input: { entityId: string; code: string; redirectUri: string }) {
    const tokens = await this.tokenRequest({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
    });
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const conn = await prisma.mtdConnection.upsert({
      where: { accountId: input.entityId },
      create: {
        accountId: input.entityId,
        accessTokenEnc: encryptToken(tokens.access_token),
        refreshTokenEnc: encryptToken(tokens.refresh_token),
        expiresAt,
        status: MtdStatus.NOT_CONNECTED,
      },
      update: {
        accessTokenEnc: encryptToken(tokens.access_token),
        refreshTokenEnc: encryptToken(tokens.refresh_token),
        expiresAt,
      },
      select: { id: true },
    });
    return { connectionId: conn.id, expiresAt: expiresAt.toISOString() };
  }

  async refreshTokens(entityId: string): Promise<{ expiresAt: string }> {
    const conn = await prisma.mtdConnection.findUniqueOrThrow({
      where: { accountId: entityId },
      select: { refreshTokenEnc: true },
    });
    if (!conn.refreshTokenEnc) throw new Error("No refresh token stored");
    try {
      const tokens = await this.tokenRequest({
        grant_type: "refresh_token",
        refresh_token: decryptToken(conn.refreshTokenEnc),
      });
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await prisma.mtdConnection.update({
        where: { accountId: entityId },
        data: {
          accessTokenEnc: encryptToken(tokens.access_token),
          refreshTokenEnc: encryptToken(tokens.refresh_token),
          expiresAt,
          status: MtdStatus.CONNECTED,
        },
      });
      return { expiresAt: expiresAt.toISOString() };
    } catch (e) {
      // invalid_grant -> the user must re-authorise.
      await prisma.mtdConnection.update({
        where: { accountId: entityId },
        data: { status: MtdStatus.EXPIRED },
      });
      throw e;
    }
  }

  private async tokenRequest(body: Record<string, string>): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const res = await fetch(`${this.baseUrl}${HMRC_TOKEN_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        ...body,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new HmrcApiError(
        json.error_description ?? json.error ?? "OAuth token request failed",
        res.status,
        json.error,
      );
    }
    return json;
  }

  // -------------------------------------------------------------------------
  // Authenticated API calls
  // -------------------------------------------------------------------------

  private async connection(entityId: string) {
    return prisma.mtdConnection.findUniqueOrThrow({
      where: { accountId: entityId },
      select: {
        accessTokenEnc: true,
        nino: true,
        businessIncomeSourceId: true,
        deviceId: true,
      },
    });
  }

  private requireNino(nino: string | null): string {
    if (!nino) throw new Error("A National Insurance number is required for MTD calls");
    return nino;
  }

  private async apiFetch<T>(
    entityId: string,
    path: string,
    init: {
      method?: string;
      body?: unknown;
      fraudHeaders?: Record<string, string>;
      query?: Record<string, string>;
      deviceId?: string | null;
      retry?: boolean;
    } = {},
  ): Promise<T> {
    const conn = await this.connection(entityId);
    if (!conn.accessTokenEnc) throw new Error("Not connected to HMRC");
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

    const fraud = {
      ...buildFraudHeaders({ deviceId: conn.deviceId ?? init.deviceId ?? undefined }),
      ...(init.fraudHeaders ?? {}),
    };
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${decryptToken(conn.accessTokenEnc)}`,
        Accept: HMRC_ACCEPT,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...fraud,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    if (res.status === 401 && init.retry !== false) {
      await this.refreshTokens(entityId); // refresh-once then retry
      return this.apiFetch<T>(entityId, path, { ...init, retry: false });
    }

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new HmrcApiError(
        json.message ?? `HMRC request failed (${res.status})`,
        res.status,
        json.code,
        json.errors,
      );
    }
    return json as T;
  }

  // -------------------------------------------------------------------------
  // Income sources / obligations
  // -------------------------------------------------------------------------

  async listIncomeSources(input: {
    entityId: string;
    fraudHeaders?: Record<string, string>;
  }): Promise<MtdIncomeSourceDTO[]> {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const json = await this.apiFetch<{
      listOfBusinesses?: {
        businessId: string;
        typeOfBusiness: string;
        tradingName?: string;
      }[];
    }>(input.entityId, `/individuals/business/details/${nino}/list`, {
      fraudHeaders: input.fraudHeaders,
    });
    return (json.listOfBusinesses ?? []).map((b) => ({
      businessId: b.businessId,
      typeOfBusiness: b.typeOfBusiness as MtdIncomeSourceDTO["typeOfBusiness"],
      tradingName: b.tradingName,
    }));
  }

  async getObligations(input: {
    entityId: string;
    taxYear: string;
    fraudHeaders?: Record<string, string>;
  }): Promise<MtdObligationDTO[]> {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const { from, to } = taxYearToFromTo(input.taxYear);
    const json = await this.apiFetch<{
      obligations?: {
        obligationDetails?: {
          periodKey: string;
          start: string;
          end: string;
          due: string;
          status: string;
        }[];
      }[];
    }>(input.entityId, `/obligations/details/${nino}/income-and-expenditure`, {
      query: { from, to },
      fraudHeaders: input.fraudHeaders,
    });
    const details = json.obligations?.flatMap((o) => o.obligationDetails ?? []) ?? [];
    return details.map((d) => ({
      periodKey: d.periodKey,
      startDate: new Date(d.start).toISOString(),
      endDate: new Date(d.end).toISOString(),
      dueDate: new Date(d.due).toISOString(),
      type: "QUARTERLY_UPDATE",
      status: d.status === "Fulfilled" ? "FULFILLED" : "OPEN",
    }));
  }

  // -------------------------------------------------------------------------
  // Submissions
  // -------------------------------------------------------------------------

  async submitQuarterlyUpdate(input: {
    entityId: string;
    periodKey: string;
    summary: PropertyIncomeSummary;
    fraudHeaders?: Record<string, string>;
  }) {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const businessId = conn.businessIncomeSourceId;
    if (!businessId) throw new Error("No business income source selected");
    const seg = BUSINESS_TYPE_PATH["uk-property"];
    const s = input.summary;
    // HMRC's UK-property period body (decimal pounds). In production the period
    // fromDate/toDate are taken from the matching obligation and added here.
    const body = {
      income: {
        periodAmount: toPounds(
          s.income.rentIncome +
            s.income.premiumsOfLeaseGrant +
            s.income.otherPropertyIncome,
        ),
        premiumsOfLeaseGrant: toPounds(s.income.premiumsOfLeaseGrant),
        otherIncome: toPounds(s.income.otherPropertyIncome),
      },
      expenses: {
        premisesRunningCosts: toPounds(s.expenses.premisesRunningCosts),
        repairsAndMaintenance: toPounds(s.expenses.repairsAndMaintenance),
        financialCosts: toPounds(s.expenses.financialCosts),
        professionalFees: toPounds(s.expenses.professionalFees),
        costOfServices: toPounds(s.expenses.costOfServices),
        other: toPounds(s.expenses.other),
      },
    };
    const json = await this.apiFetch<{ submissionId?: string; transactionReference?: string }>(
      input.entityId,
      `/individuals/business/property/${seg}/${nino}/${businessId}/period`,
      { method: "POST", body, fraudHeaders: input.fraudHeaders },
    );
    const receiptId = json.transactionReference ?? json.submissionId ?? "";
    return { submissionId: json.submissionId ?? receiptId, receiptId, status: "ACCEPTED" as const };
  }

  async submitEops(input: {
    entityId: string;
    taxYear: string;
    businessId: string;
    fraudHeaders?: Record<string, string>;
  }) {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const { from, to } = taxYearToFromTo(input.taxYear);
    // EOPS was folded into crystallisation in newer API versions; this is
    // version-guarded by HMRC_ACCEPT and may 410 on the latest sandbox.
    const json = await this.apiFetch<{ transactionReference?: string }>(
      input.entityId,
      `/individuals/business/property/${nino}/${input.businessId}/${from}/${to}/declaration`,
      { method: "POST", body: { finalised: true }, fraudHeaders: input.fraudHeaders },
    );
    return {
      submissionId: `eops-${input.taxYear}`,
      receiptId: json.transactionReference ?? "",
      status: "ACCEPTED" as const,
    };
  }

  async submitFinalDeclaration(input: {
    entityId: string;
    taxYear: string;
    calculationId: string;
    fraudHeaders?: Record<string, string>;
  }) {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const json = await this.apiFetch<{ transactionReference?: string }>(
      input.entityId,
      `/individuals/calculations/${nino}/self-assessment/${input.taxYear}/${input.calculationId}/crystallise`,
      { method: "POST", body: {}, fraudHeaders: input.fraudHeaders },
    );
    return {
      submissionId: `final-${input.taxYear}`,
      receiptId: json.transactionReference ?? "",
      status: "ACCEPTED" as const,
    };
  }

  // -------------------------------------------------------------------------
  // Calculation (async trigger + poll)
  // -------------------------------------------------------------------------

  async triggerCalculation(input: {
    entityId: string;
    taxYear: string;
    calculationType?: "in-year" | "final-declaration";
    fraudHeaders?: Record<string, string>;
  }): Promise<{ calculationId: string }> {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const json = await this.apiFetch<{ calculationId: string }>(
      input.entityId,
      `/individuals/calculations/${nino}/self-assessment`,
      {
        method: "POST",
        body: { finalDeclaration: input.calculationType === "final-declaration" },
        query: { taxYear: input.taxYear },
        fraudHeaders: input.fraudHeaders,
      },
    );
    return { calculationId: json.calculationId };
  }

  async getCalculation(input: {
    entityId: string;
    taxYear: string;
    calculationId: string;
    fraudHeaders?: Record<string, string>;
  }): Promise<MtdCalculationDTO> {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const json = await this.apiFetch<{
      metadata?: { calculationType?: string; calculationError?: unknown };
      calculation?: {
        taxCalculation?: {
          incomeTax?: { incomeTaxCharged?: number };
          totalIncomeTaxAndNicsDue?: number;
          totalTaxableIncome?: number;
        };
        endOfYearEstimate?: { totalAllowancesAndDeductions?: number; totalEstimatedIncome?: number };
      };
      messages?: { type: string; text: string }[];
    }>(
      input.entityId,
      `/individuals/calculations/${nino}/self-assessment/${input.taxYear}/${input.calculationId}`,
      { fraudHeaders: input.fraudHeaders },
    );

    const calc = json.calculation?.taxCalculation;
    const eoy = json.calculation?.endOfYearEstimate;
    const crystallised = json.metadata?.calculationType === "crystallisation";
    // A 200 with no taxCalculation yet means HMRC is still computing.
    const status = json.metadata?.calculationError
      ? "ERROR"
      : calc
        ? "READY"
        : "PENDING";
    return {
      calculationId: input.calculationId,
      taxYear: input.taxYear,
      status,
      estimateOrCrystallised: crystallised ? "crystallised" : "estimate",
      totalIncomePence: fromPounds(eoy?.totalEstimatedIncome),
      totalAllowancesAndDeductionsPence: fromPounds(eoy?.totalAllowancesAndDeductions),
      totalTaxableIncomePence: fromPounds(calc?.totalTaxableIncome),
      incomeTaxAndNicsDuePence: fromPounds(calc?.totalIncomeTaxAndNicsDue),
      messages: json.messages,
      metadataJson: json.metadata,
    };
  }

  async getBusinessIncomeSourceSummary(input: {
    entityId: string;
    taxYear: string;
  }): Promise<BissDTO> {
    const conn = await this.connection(input.entityId);
    const nino = this.requireNino(conn.nino);
    const businessId = conn.businessIncomeSourceId ?? "";
    const json = await this.apiFetch<{
      total?: { totalIncome?: number; totalExpenses?: number; netProfit?: number; taxableProfit?: number };
    }>(
      input.entityId,
      `/individuals/self-assessment/income-summary/${nino}/uk-property/${businessId}/${input.taxYear}`,
    );
    const t = json.total ?? {};
    return {
      taxYear: input.taxYear,
      totalIncome: fromPounds(t.totalIncome) ?? 0,
      totalExpenses: fromPounds(t.totalExpenses) ?? 0,
      netProfit: fromPounds(t.netProfit) ?? 0,
      taxableProfit: fromPounds(t.taxableProfit) ?? 0,
    };
  }
}
