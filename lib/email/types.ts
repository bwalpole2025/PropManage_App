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
}
