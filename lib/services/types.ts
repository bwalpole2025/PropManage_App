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

/** An HMRC income source (business) the connected user reports under MTD ITSA. */
export interface MtdIncomeSourceDTO {
  businessId: string;
  typeOfBusiness: "uk-property" | "foreign-property" | "self-employment";
  tradingName?: string;
  accountingType?: string;
  commencementDate?: Iso;
}

/** HMRC's tax calculation for a tax year (acceptance-critical to display). */
export interface MtdCalculationDTO {
  calculationId: string;
  taxYear: string;
  status: "PENDING" | "READY" | "ERROR";
  estimateOrCrystallised: "estimate" | "crystallised";
  totalIncomePence?: Pence;
  totalAllowancesAndDeductionsPence?: Pence;
  totalTaxableIncomePence?: Pence;
  incomeTaxAndNicsDuePence?: Pence;
  messages?: { type: string; text: string }[];
  metadataJson?: unknown;
}

/**
 * Who is performing a (delegated) submission. An ACCOUNTANT membership submitting
 * within the landlord's already-authorised connection sets onBehalfOf="agent" so
 * the adapter can set agent fraud-prevention headers and the audit log records
 * the real submitter — never used to cross account boundaries.
 */
export interface AgentContext {
  submittedByUserId: string;
  submittedByMembershipId: string;
  onBehalfOf: "self" | "agent";
  arn?: string;
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

  // Provider encrypts + persists the access/refresh tokens internally (it owns
  // the MtdConnection row); raw tokens never cross this interface boundary.
  exchangeCode(input: {
    entityId: EntityId;
    code: string;
    redirectUri: string;
  }): Promise<{ connectionId: string; expiresAt: Iso; hmrcUserId?: string }>;

  /** List the connected user's income sources (businesses); yields the businessId. */
  listIncomeSources(input: {
    entityId: EntityId;
    agentContext?: AgentContext;
    /** Pre-built HMRC fraud-prevention headers (Gov-Client / Gov-Vendor). */
    fraudHeaders?: Record<string, string>;
  }): Promise<MtdIncomeSourceDTO[]>;

  getObligations(input: {
    entityId: EntityId;
    taxYear: string;
    type?: ObligationType;
    agentContext?: AgentContext;
    /** Pre-built HMRC fraud-prevention headers (Gov-Client / Gov-Vendor). */
    fraudHeaders?: Record<string, string>;
  }): Promise<MtdObligationDTO[]>;

  submitQuarterlyUpdate(input: {
    entityId: EntityId;
    periodKey: string;
    summary: PropertyIncomeSummary;
    agentContext?: AgentContext;
    /** Pre-built HMRC fraud-prevention headers (Gov-Client / Gov-Vendor). */
    fraudHeaders?: Record<string, string>;
  }): Promise<{ submissionId: string; receiptId: string; status: SubmissionStatus }>;

  /** Trigger HMRC's (async) tax calculation; returns the id to poll with getCalculation. */
  triggerCalculation(input: {
    entityId: EntityId;
    taxYear: string;
    calculationType?: "in-year" | "final-declaration";
    agentContext?: AgentContext;
    /** Pre-built HMRC fraud-prevention headers (Gov-Client / Gov-Vendor). */
    fraudHeaders?: Record<string, string>;
  }): Promise<{ calculationId: string }>;

  /** Fetch a calculation result; caller polls until status !== "PENDING". */
  getCalculation(input: {
    entityId: EntityId;
    taxYear: string;
    calculationId: string;
    agentContext?: AgentContext;
    /** Pre-built HMRC fraud-prevention headers (Gov-Client / Gov-Vendor). */
    fraudHeaders?: Record<string, string>;
  }): Promise<MtdCalculationDTO>;

  getBusinessIncomeSourceSummary(input: {
    entityId: EntityId;
    taxYear: string;
  }): Promise<BissDTO>;

  /** End-of-Period Statement: finalise a single business's figures for the year. */
  submitEops(input: {
    entityId: EntityId;
    taxYear: string;
    businessId: string;
    agentContext?: AgentContext;
    /** Pre-built HMRC fraud-prevention headers (Gov-Client / Gov-Vendor). */
    fraudHeaders?: Record<string, string>;
  }): Promise<{ submissionId: string; receiptId: string; status: SubmissionStatus }>;

  /** Final Declaration (crystallisation) of the whole return for a tax year. */
  submitFinalDeclaration(input: {
    entityId: EntityId;
    taxYear: string;
    calculationId: string;
    agentContext?: AgentContext;
    /** Pre-built HMRC fraud-prevention headers (Gov-Client / Gov-Vendor). */
    fraudHeaders?: Record<string, string>;
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

// ---------------------------------------------------------------------------
// Spec-aligned provider names. The original interface names are kept as
// aliases so existing imports keep working.
// ---------------------------------------------------------------------------

export type BankFeedProvider = BankFeedService;
export type HmrcMtdProvider = HmrcMtdService;

// ---------------------------------------------------------------------------
// 5. PaymentService — card billing via a provider-HOSTED checkout (Stripe-style)
// ---------------------------------------------------------------------------
// We NEVER receive or store raw card data: the provider's hosted fields /
// checkout page collect it. We only ever see a session id + display-only summary.

export interface PaymentCheckoutSession {
  sessionId: string;
  /** Provider-hosted URL where the customer securely enters their card. */
  checkoutUrl: string;
}

export interface PaymentMethodSummary {
  customerId: string;
  brand: string; // display-only, returned by the provider (e.g. "Visa")
  last4: string;
}

export interface PaymentService {
  readonly providerName: string;

  /**
   * Start a provider-hosted subscription checkout. `trialEndsAt` schedules the
   * first charge for the end of the trial. No card data passes through us.
   */
  createCheckoutSession(input: {
    entityId: EntityId;
    pricePence: Pence;
    interval: string;
    trialEndsAt?: Iso | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentCheckoutSession>;

  /** Confirm a completed hosted checkout; returns display-only card details. */
  confirmCheckout(input: {
    entityId: EntityId;
    sessionId: string;
  }): Promise<PaymentMethodSummary>;

  /** Cancel the customer's subscription with the provider. */
  cancelSubscription(input: { entityId: EntityId }): Promise<void>;
}

// ---------------------------------------------------------------------------
// 4. DocumentStorage — S3-compatible object storage for documents & receipts
// ---------------------------------------------------------------------------

export interface PutResult {
  key: string;
  sizeBytes: number;
}

export interface DocumentStorage {
  readonly driverName: string;
  /** Store bytes under a key; returns the canonical key + size. */
  put(
    key: string,
    bytes: Uint8Array | Buffer,
    contentType: string,
  ): Promise<PutResult>;
  /** A time-limited URL to fetch the object (S3 presigned / local route). */
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Read raw bytes (used by the local download route for the mock driver). */
  getBytes(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
