// Service interfaces for deferred external integrations. Concrete `Mock*` and
// (future) `Real*` classes implement these; the factory in ./index.ts selects
// which to use based on env. UI and data code depend ONLY on these interfaces.

import type { BankConnStatus, ObligationType, SubmissionStatus } from "../enums";
import type { TaxEstimateOptions, TaxEstimateResult, TxnForEstimate } from "../tax";

export type Pence = number;
export type Iso = string;
export type EntityId = string;

// ---------------------------------------------------------------------------
// Shared DTOs
// ---------------------------------------------------------------------------

export interface BankAccountDTO {
  id: string;
  name: string;
  sortCode?: string;
  accountNumberMasked?: string;
  currency: string;
}

export interface BankTransactionDTO {
  providerTxnId: string;
  amountPence: Pence; // signed: positive = credit/in, negative = debit/out
  date: Iso;
  description: string;
  rawCategory?: string;
}

export type BankWebhookEvent =
  | { kind: "TRANSACTIONS_AVAILABLE"; connectionId: string; accountIds: string[] }
  | { kind: "CONNECTION_EXPIRED"; connectionId: string };

export interface MtdObligationDTO {
  periodKey: string;
  startDate: Iso;
  endDate: Iso;
  dueDate: Iso;
  type: ObligationType;
  status: "OPEN" | "FULFILLED";
}

/** SA105-aligned period totals submitted to HMRC. */
export interface PropertyIncomeSummary {
  taxYear: string;
  periodKey?: string;
  income: {
    rentIncome: Pence;
    premiumsOfLeaseGrant: Pence;
    otherPropertyIncome: Pence;
  };
  expenses: {
    premisesRunningCosts: Pence; // rates, insurance, ground rent
    repairsAndMaintenance: Pence;
    financialCosts: Pence; // finance/loan interest
    professionalFees: Pence;
    costOfServices: Pence;
    other: Pence;
  };
}

export interface BissDTO {
  taxYear: string;
  totalIncome: Pence;
  totalExpenses: Pence;
  netProfit: Pence;
  taxableProfit: Pence;
}

// ---------------------------------------------------------------------------
// 1. BankFeedService — open-banking aggregator (TrueLayer / Plaid style)
// ---------------------------------------------------------------------------

export interface BankFeedService {
  readonly providerName: string;

  createLinkSession(input: {
    entityId: EntityId;
    redirectUri: string;
  }): Promise<{ linkSessionId: string; linkUrl: string }>;

  completeLink(input: {
    entityId: EntityId;
    linkSessionId: string;
    code: string;
  }): Promise<{ connectionId: string; accounts: BankAccountDTO[] }>;

  listAccounts(connectionId: string): Promise<BankAccountDTO[]>;

  listTransactions(input: {
    accountId: string;
    from: Iso;
    to: Iso;
    cursor?: string;
  }): Promise<{ transactions: BankTransactionDTO[]; nextCursor?: string }>;

  handleWebhook(input: {
    headers: Record<string, string>;
    rawBody: string;
  }): Promise<BankWebhookEvent>;

  refreshConnection(connectionId: string): Promise<{ status: BankConnStatus }>;
  revokeConnection(connectionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// 2. HmrcMtdService — Making Tax Digital for Income Tax
// ---------------------------------------------------------------------------

export interface HmrcMtdService {
  readonly mode: string;

  getAuthorizationUrl(input: {
    entityId: EntityId;
    redirectUri: string;
    state: string;
  }): string;

  exchangeCode(input: {
    entityId: EntityId;
    code: string;
    redirectUri: string;
  }): Promise<{ connectionId: string; expiresAt: Iso }>;

  getObligations(input: {
    entityId: EntityId;
    taxYear: string;
    type?: ObligationType;
  }): Promise<MtdObligationDTO[]>;

  submitQuarterlyUpdate(input: {
    entityId: EntityId;
    periodKey: string;
    summary: PropertyIncomeSummary;
  }): Promise<{ submissionId: string; receiptId: string; status: SubmissionStatus }>;

  getBusinessIncomeSourceSummary(input: {
    entityId: EntityId;
    taxYear: string;
  }): Promise<BissDTO>;

  submitFinalDeclaration(input: {
    entityId: EntityId;
    taxYear: string;
    calculationId: string;
  }): Promise<{ submissionId: string; receiptId: string; status: SubmissionStatus }>;

  refreshTokens(entityId: EntityId): Promise<{ expiresAt: Iso }>;
}

// ---------------------------------------------------------------------------
// 3. TaxEstimationService — pure compute (no external dependency)
// ---------------------------------------------------------------------------

export interface TaxEstimationService {
  estimate(input: {
    entityId: EntityId;
    taxYear: string;
    transactions: TxnForEstimate[];
    options?: TaxEstimateOptions;
  }): TaxEstimateResult;

  toPropertyIncomeSummary(result: TaxEstimateResult): PropertyIncomeSummary;
}
