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

export function operationalAlertEmail(input: {
  name?: string | null;
  subject: string;
  heading: string;
  body: string;
  href?: string | null;
}): RenderedEmail {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const link = input.href ? `\n\nView in PropManage: ${input.href}` : "";
  const linkHtml = input.href
    ? `<p><a href="${input.href}">View in PropManage</a></p>`
    : "";
  return {
    subject: input.subject,
    text: `${greeting}\n\n${input.body}${link}`,
    html: `<p>${greeting}</p><p><strong>${input.heading}</strong></p><p>${input.body}</p>${linkHtml}`,
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
