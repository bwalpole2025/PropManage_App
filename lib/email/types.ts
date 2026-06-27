export interface SendResult {
  id: string;
}

export interface EmailSender {
  readonly driver: string;
  sendVerificationEmail(input: {
    to: string;
    name?: string | null;
    verifyUrl: string;
  }): Promise<SendResult>;
  sendPasswordResetEmail(input: {
    to: string;
    name?: string | null;
    resetUrl: string;
  }): Promise<SendResult>;
  /** Operational alert (e.g. rent overdue) gated by the account's notification prefs. */
  sendOperationalAlert(input: {
    to: string;
    name?: string | null;
    subject: string;
    heading: string;
    body: string;
    href?: string | null;
  }): Promise<SendResult>;
  /** Structured compliance alert (property / item / deadline / penalty + RAG). */
  sendComplianceAlert(input: {
    to: string;
    name?: string | null;
    subject: string;
    tierLabel: string;
    rag: "RED" | "AMBER" | "GREEN";
    itemLabel: string;
    propertyLabel: string;
    deadlineText: string;
    penalty: string;
    href?: string | null;
  }): Promise<SendResult>;
  /** Period report digest (heading + metrics table + notes) for the account holder. */
  sendReport(input: {
    to: string;
    name?: string | null;
    subject: string;
    heading: string;
    periodLabel: string;
    intro?: string;
    metrics: { label: string; value: string }[];
    notes?: string[];
    href?: string | null;
  }): Promise<SendResult>;
}
