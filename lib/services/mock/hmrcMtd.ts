import { ObligationType, SubmissionStatus, MtdStatus } from "../../enums";
import { taxYearStartDate } from "../../format";
import { prisma } from "../../db";
import { encryptToken } from "../../crypto";
import { MTD_REDIRECT_PATH } from "../../mtd/constants";
import type {
  BissDTO,
  HmrcMtdService,
  MtdCalculationDTO,
  MtdIncomeSourceDTO,
  MtdObligationDTO,
  PropertyIncomeSummary,
} from "../types";

// Mock HMRC MTD-for-IT service. It faithfully simulates the sandbox CONTRACT
// (income sources, obligations, period-summary submit, the ASYNC two-step
// calculation, EOPS, final declaration) without any network call, so the whole
// flow is runnable in dev/CI without sandbox credentials. exchangeCode persists
// synthetic ENCRYPTED tokens (never raw secrets) exactly like the real adapter.

function quarterPeriods(taxYearLabel: string): MtdObligationDTO[] {
  const start = taxYearStartDate(taxYearLabel); // 6 Apr (UTC)
  const startYear = start.getUTCFullYear();
  // Standard MTD quarterly periods (6 Apr–5 Jul, 6 Jul–5 Oct, 6 Oct–5 Jan, 6 Jan–5 Apr).
  const quarters = [
    { sM: 3, sD: 6, eM: 6, eD: 5, eY: startYear, dM: 7, dD: 5, dY: startYear },
    { sM: 6, sD: 6, eM: 9, eD: 5, eY: startYear, dM: 10, dD: 5, dY: startYear },
    { sM: 9, sD: 6, eM: 0, eD: 5, eY: startYear + 1, dM: 1, dD: 5, dY: startYear + 1 },
    { sM: 0, sD: 6, eM: 3, eD: 5, eY: startYear + 1, dM: 4, dD: 5, dY: startYear + 1 },
  ];
  const sYear = [startYear, startYear, startYear, startYear + 1];
  return quarters.map((q, i) => ({
    periodKey: `${taxYearLabel}-Q${i + 1}`,
    startDate: new Date(Date.UTC(sYear[i], q.sM, q.sD)).toISOString(),
    endDate: new Date(Date.UTC(q.eY, q.eM, q.eD)).toISOString(),
    dueDate: new Date(Date.UTC(q.dY, q.dM, q.dD)).toISOString(),
    type: ObligationType.QUARTERLY_UPDATE,
    status: "OPEN" as const,
  }));
}

function finalDeclaration(taxYearLabel: string): MtdObligationDTO {
  const start = taxYearStartDate(taxYearLabel);
  const startYear = start.getUTCFullYear();
  return {
    periodKey: `${taxYearLabel}-FINAL`,
    startDate: new Date(Date.UTC(startYear, 3, 6)).toISOString(),
    endDate: new Date(Date.UTC(startYear + 1, 3, 5)).toISOString(),
    dueDate: new Date(Date.UTC(startYear + 2, 0, 31)).toISOString(), // 31 Jan
    type: ObligationType.FINAL_DECLARATION,
    status: "OPEN",
  };
}

function sumSummary(s: PropertyIncomeSummary) {
  const income =
    s.income.rentIncome + s.income.premiumsOfLeaseGrant + s.income.otherPropertyIncome;
  const expenses =
    s.expenses.premisesRunningCosts +
    s.expenses.repairsAndMaintenance +
    s.expenses.financialCosts +
    s.expenses.professionalFees +
    s.expenses.costOfServices +
    s.expenses.other;
  return { income, expenses };
}

let receiptCounter = 1000;

export class MockHmrcMtdService implements HmrcMtdService {
  readonly mode = "mock";

  // In-process state so the standalone drive (which calls this service directly,
  // bypassing the DB action layer) can observe FULFILLED obligations and a
  // calculation derived from what was actually submitted.
  private submitted = new Map<string, Map<string, PropertyIncomeSummary>>();
  private calcPolled = new Set<string>();

  private periodsFor(entityId: string): Map<string, PropertyIncomeSummary> {
    let m = this.submitted.get(entityId);
    if (!m) {
      m = new Map();
      this.submitted.set(entityId, m);
    }
    return m;
  }

  getAuthorizationUrl(input: {
    entityId: string;
    redirectUri: string;
    state: string;
  }): string {
    // Route through the SAME callback the real provider uses, with mockAuth=1 so
    // the callback synthesizes an authorization code instead of receiving one.
    const params = new URLSearchParams({
      mockAuth: "1",
      state: input.state,
      redirect_uri: input.redirectUri,
    });
    return `${MTD_REDIRECT_PATH}?${params.toString()}`;
  }

  async exchangeCode(input: { entityId: string; code: string; redirectUri: string }) {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const hmrcUserId = `mock-hmrc-${input.entityId}`;
    const tokens = {
      hmrcUserId,
      nino: "AA000000A",
      accessTokenEnc: encryptToken(`mock-access-${input.entityId}`),
      refreshTokenEnc: encryptToken(`mock-refresh-${input.entityId}`),
      expiresAt,
    };
    // Persist synthetic encrypted tokens like the real adapter. When the entity
    // isn't a real Account (e.g. the standalone drive), fall back to a synthetic
    // connection id rather than violating the FK.
    const account = await prisma.account
      .findUnique({ where: { id: input.entityId }, select: { id: true } })
      .catch(() => null);
    if (!account) {
      return {
        connectionId: `mock-mtd-${input.entityId}`,
        expiresAt: expiresAt.toISOString(),
        hmrcUserId,
      };
    }
    const conn = await prisma.mtdConnection.upsert({
      where: { accountId: input.entityId },
      create: { accountId: input.entityId, status: MtdStatus.NOT_CONNECTED, ...tokens },
      update: tokens,
      select: { id: true },
    });
    return { connectionId: conn.id, expiresAt: expiresAt.toISOString(), hmrcUserId };
  }

  async listIncomeSources(): Promise<MtdIncomeSourceDTO[]> {
    return [
      {
        businessId: "XBIS00000000001",
        typeOfBusiness: "uk-property",
        tradingName: "UK Property",
        accountingType: "CASH",
      },
    ];
  }

  async getObligations(input: {
    entityId: string;
    taxYear: string;
    type?: ObligationType;
  }): Promise<MtdObligationDTO[]> {
    const submitted = this.periodsFor(input.entityId);
    const all = [
      ...quarterPeriods(input.taxYear),
      finalDeclaration(input.taxYear),
    ].map((o) =>
      submitted.has(o.periodKey) ? { ...o, status: "FULFILLED" as const } : o,
    );
    return input.type ? all.filter((o) => o.type === input.type) : all;
  }

  async submitQuarterlyUpdate(input: {
    entityId: string;
    periodKey: string;
    summary: PropertyIncomeSummary;
  }) {
    this.periodsFor(input.entityId).set(input.periodKey, input.summary);
    return {
      submissionId: `mock-sub-${input.periodKey}`,
      receiptId: `HMRC-RECEIPT-${receiptCounter++}`,
      status: SubmissionStatus.ACCEPTED,
    };
  }

  async triggerCalculation(input: {
    entityId: string;
    taxYear: string;
    calculationType?: "in-year" | "final-declaration";
  }): Promise<{ calculationId: string }> {
    const kind = input.calculationType === "final-declaration" ? "final" : "iy";
    return { calculationId: `calc-${kind}-${input.taxYear}-${input.entityId}` };
  }

  async getCalculation(input: {
    entityId: string;
    taxYear: string;
    calculationId: string;
  }): Promise<MtdCalculationDTO> {
    const crystallised = input.calculationId.startsWith("calc-final-");
    // Simulate async crystallisation: PENDING on first poll, READY afterwards.
    if (!this.calcPolled.has(input.calculationId)) {
      this.calcPolled.add(input.calculationId);
      return {
        calculationId: input.calculationId,
        taxYear: input.taxYear,
        status: "PENDING",
        estimateOrCrystallised: crystallised ? "crystallised" : "estimate",
      };
    }

    // Derive a real figure from what was submitted; fall back to a non-zero synthetic.
    let income = 0;
    let expenses = 0;
    for (const s of this.periodsFor(input.entityId).values()) {
      const t = sumSummary(s);
      income += t.income;
      expenses += t.expenses;
    }
    if (income === 0) {
      income = 1_200_000;
      expenses = 230_000;
    }
    const taxable = Math.max(0, income - expenses);
    const taxDue = Math.round(taxable * 0.2);
    return {
      calculationId: input.calculationId,
      taxYear: input.taxYear,
      status: "READY",
      estimateOrCrystallised: crystallised ? "crystallised" : "estimate",
      totalIncomePence: income,
      totalAllowancesAndDeductionsPence: expenses,
      totalTaxableIncomePence: taxable,
      incomeTaxAndNicsDuePence: taxDue,
      messages: [{ type: "info", text: "Sandbox calculation (mock)" }],
    };
  }

  async getBusinessIncomeSourceSummary(input: {
    entityId: string;
    taxYear: string;
  }): Promise<BissDTO> {
    let income = 0;
    let expenses = 0;
    for (const s of this.periodsFor(input.entityId).values()) {
      const t = sumSummary(s);
      income += t.income;
      expenses += t.expenses;
    }
    const net = income - expenses;
    return {
      taxYear: input.taxYear,
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: net,
      taxableProfit: Math.max(0, net),
    };
  }

  async submitEops(input: { entityId: string; taxYear: string; businessId: string }) {
    return {
      submissionId: `mock-eops-${input.taxYear}`,
      receiptId: `HMRC-RECEIPT-${receiptCounter++}`,
      status: SubmissionStatus.ACCEPTED,
    };
  }

  async submitFinalDeclaration(input: {
    entityId: string;
    taxYear: string;
    calculationId: string;
  }) {
    return {
      submissionId: `mock-final-${input.taxYear}`,
      receiptId: `HMRC-RECEIPT-${receiptCounter++}`,
      status: SubmissionStatus.ACCEPTED,
    };
  }

  async refreshTokens(entityId: string): Promise<{ expiresAt: string }> {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    await prisma.mtdConnection
      .update({
        where: { accountId: entityId },
        data: { expiresAt, accessTokenEnc: encryptToken(`mock-access-${entityId}`) },
      })
      .catch(() => {});
    return { expiresAt: expiresAt.toISOString() };
  }
}
