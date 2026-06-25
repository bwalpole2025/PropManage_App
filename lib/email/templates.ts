// Pure email templates — trivially unit-testable.

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function verificationEmail(input: {
  name?: string | null;
  verifyUrl: string;
}): RenderedEmail {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  return {
    subject: "Verify your PropManage email",
    text: `${greeting}\n\nConfirm your email address to finish setting up PropManage:\n${input.verifyUrl}\n\nIf you didn't create an account, you can ignore this email.`,
    html: `<p>${greeting}</p><p>Confirm your email address to finish setting up PropManage:</p><p><a href="${input.verifyUrl}">Verify email</a></p>`,
  };
}

export function passwordResetEmail(input: {
  name?: string | null;
  resetUrl: string;
}): RenderedEmail {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  return {
    subject: "Reset your PropManage password",
    text: `${greeting}\n\nReset your password using the link below (valid for 1 hour):\n${input.resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>${greeting}</p><p>Reset your password using the link below (valid for 1 hour):</p><p><a href="${input.resetUrl}">Reset password</a></p>`,
  };
}
