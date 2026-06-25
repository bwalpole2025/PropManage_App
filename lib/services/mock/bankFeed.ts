import { BankConnStatus } from "../../enums";
import type {
  BankAccountDTO,
  BankFeedService,
  BankTransactionDTO,
  BankWebhookEvent,
} from "../types";

// Deterministic in-memory bank feed. Generates a believable stream of rent
// credits and expense debits so the Reconcile screen has something to match
// against without a real open-banking connection.

const MOCK_ACCOUNTS: BankAccountDTO[] = [
  {
    id: "mock-acc-current",
    name: "Property Current Account",
    sortCode: "04-00-04",
    accountNumberMasked: "****8842",
    currency: "GBP",
  },
];

function pseudoTransactions(accountId: string): BankTransactionDTO[] {
  const txns: BankTransactionDTO[] = [];
  const today = new Date();
  // 6 months of monthly rent credits + a few expenses.
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 3);
    txns.push({
      providerTxnId: `${accountId}-rent-${i}`,
      amountPence: 125_000,
      date: d.toISOString(),
      description: "BANK CREDIT TENANT J SMITH RENT",
      rawCategory: "transfer",
    });
    if (i % 2 === 0) {
      const e = new Date(today.getFullYear(), today.getMonth() - i, 15);
      txns.push({
        providerTxnId: `${accountId}-exp-${i}`,
        amountPence: -8_900,
        date: e.toISOString(),
        description: "DIRECT DEBIT LANDLORD INSURANCE CO",
        rawCategory: "insurance",
      });
    }
  }
  return txns;
}

export class MockBankFeedService implements BankFeedService {
  readonly providerName = "mock";

  async createLinkSession(input: { entityId: string; redirectUri: string }) {
    const linkSessionId = `mock-link-${input.entityId}`;
    // In a real provider this is the provider-hosted consent URL; here it points
    // at our mock consent page.
    return {
      linkSessionId,
      linkUrl: `/transactions/connect?mockLink=${linkSessionId}`,
    };
  }

  async completeLink(input: {
    entityId: string;
    linkSessionId: string;
    code: string;
  }) {
    return {
      connectionId: `mock-conn-${input.entityId}`,
      accounts: MOCK_ACCOUNTS,
    };
  }

  async listAccounts(): Promise<BankAccountDTO[]> {
    return MOCK_ACCOUNTS;
  }

  async listTransactions(input: {
    accountId: string;
    from: string;
    to: string;
    cursor?: string;
  }): Promise<{ transactions: BankTransactionDTO[]; nextCursor?: string }> {
    const from = new Date(input.from).getTime();
    const to = new Date(input.to).getTime();
    const transactions = pseudoTransactions(input.accountId).filter((t) => {
      const ts = new Date(t.date).getTime();
      return ts >= from && ts <= to;
    });
    return { transactions };
  }

  async handleWebhook(input: {
    headers: Record<string, string>;
    rawBody: string;
  }): Promise<BankWebhookEvent> {
    const body = JSON.parse(input.rawBody || "{}");
    return {
      kind: "TRANSACTIONS_AVAILABLE",
      connectionId: body.connectionId ?? "mock-conn",
      accountIds: body.accountIds ?? [MOCK_ACCOUNTS[0].id],
    };
  }

  async refreshConnection(): Promise<{ status: BankConnStatus }> {
    return { status: BankConnStatus.ACTIVE };
  }

  async revokeConnection(): Promise<void> {
    // no-op for mock
  }
}
