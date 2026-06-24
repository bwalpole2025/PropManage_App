import { ObligationType, SubmissionStatus } from "../../enums";
import { taxYearStartDate } from "../../format";
import type {
  BissDTO,
  HmrcMtdService,
  MtdObligationDTO,
  PropertyIncomeSummary,
} from "../types";

// Mock HMRC MTD for IT service. Generates the four standard quarterly update
// periods plus a final declaration for a tax year, and echoes submissions back
// as ACCEPTED with a synthetic receipt id. No real OAuth or HMRC sandbox calls.

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
  return quarters.map((q, i) => {
    const startDate = new Date(Date.UTC(sYear[i], q.sM, q.sD));
    const endDate = new Date(Date.UTC(q.eY, q.eM, q.eD));
    const dueDate = new Date(Date.UTC(q.dY, q.dM, q.dD));
    const now = Date.now();
    return {
      periodKey: `${taxYearLabel}-Q${i + 1}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      dueDate: dueDate.toISOString(),
      type: ObligationType.QUARTERLY_UPDATE,
      status: endDate.getTime() < now ? "OPEN" : "OPEN",
    };
  });
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

let receiptCounter = 1000;

export class MockHmrcMtdService implements HmrcMtdService {
  readonly mode = "mock";

  getAuthorizationUrl(input: {
    entityId: string;
    redirectUri: string;
    state: string;
  }): string {
    const params = new URLSearchParams({
      redirect_uri: input.redirectUri,
      state: input.state,
      entity: input.entityId,
    });
    return `/mtd?mockAuth=1&${params.toString()}`;
  }

  async exchangeCode(input: { entityId: string; code: string; redirectUri: string }) {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    return { connectionId: `mock-mtd-${input.entityId}`, expiresAt };
  }

  async getObligations(input: {
    entityId: string;
    taxYear: string;
    type?: ObligationType;
  }): Promise<MtdObligationDTO[]> {
    const all = [
      ...quarterPeriods(input.taxYear),
      finalDeclaration(input.taxYear),
    ];
    return input.type ? all.filter((o) => o.type === input.type) : all;
  }

  async submitQuarterlyUpdate(input: {
    entityId: string;
    periodKey: string;
    summary: PropertyIncomeSummary;
  }) {
    return {
      submissionId: `mock-sub-${input.periodKey}`,
      receiptId: `HMRC-RECEIPT-${receiptCounter++}`,
      status: SubmissionStatus.ACCEPTED,
    };
  }

  async getBusinessIncomeSourceSummary(input: {
    entityId: string;
    taxYear: string;
  }): Promise<BissDTO> {
    return {
      taxYear: input.taxYear,
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      taxableProfit: 0,
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

  async refreshTokens(): Promise<{ expiresAt: string }> {
    return { expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() };
  }
}
