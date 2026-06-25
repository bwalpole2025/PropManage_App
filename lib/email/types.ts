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
}
