import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@react-email/components";
import { createElement } from "react";
import { BetaWelcomeEmail } from "@/lib/email/react/BetaWelcomeEmail";
import { ComplianceAlertEmail } from "@/lib/email/react/ComplianceAlertEmail";

// Capture every payload passed to Resend's emails.send so we can assert on the
// From address, recipient and rendered React element without hitting the API.
interface SendPayload {
  from: string;
  to: string[];
  subject: string;
  replyTo?: string;
  react?: unknown;
}
const sendMock = vi.fn(async (_payload: SendPayload) => ({
  data: { id: "msg_123" },
  error: null,
}));
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

describe("Resend emailService", () => {
  const ORIGINAL_KEY = process.env.RESEND_API_KEY;
  beforeEach(() => {
    sendMock.mockClear();
    process.env.RESEND_API_KEY = "re_test_123";
  });
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = ORIGINAL_KEY;
  });

  it("sends the beta welcome email from the verified production domain", async () => {
    const { sendBetaWelcomeEmail } = await import("@/lib/email/emailService");
    const res = await sendBetaWelcomeEmail("tester@example.com");

    expect(res.id).toBe("msg_123");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toContain("@propmanage.app");
    expect(payload.to).toEqual(["tester@example.com"]);
    expect(payload.subject).toMatch(/beta/i);
    expect(payload.react).toBeTruthy();
  });

  it("sends a compliance alert naming the property and obligation", async () => {
    const { sendComplianceAlertEmail } = await import("@/lib/email/emailService");
    await sendComplianceAlertEmail(
      "landlord@example.com",
      "12 Acacia Avenue, Leeds",
      "Gas Safety Certificate",
    );

    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toContain("@propmanage.app");
    expect(payload.to).toEqual(["landlord@example.com"]);
    expect(payload.subject).toContain("Gas Safety Certificate");
    expect(payload.subject).toContain("12 Acacia Avenue, Leeds");
  });

  it("throws a clear error when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendBetaWelcomeEmail } = await import("@/lib/email/emailService");
    await expect(sendBetaWelcomeEmail("x@y.com")).rejects.toThrow(
      /RESEND_API_KEY/,
    );
  });
});

describe("React-Email templates render expected copy", () => {
  it("beta welcome covers active account + bug reporting", async () => {
    const html = await render(
      createElement(BetaWelcomeEmail, {
        appUrl: "https://app.propmanage.app",
        supportEmail: "support@propmanage.app",
      }),
    );
    expect(html).toMatch(/active/i);
    expect(html).toMatch(/bug/i);
    expect(html).toContain("support@propmanage.app");
    expect(html).toContain("https://app.propmanage.app");
  });

  it("compliance alert names the property, obligation and a deadline + CTA", async () => {
    const html = await render(
      createElement(ComplianceAlertEmail, {
        appUrl: "https://app.propmanage.app",
        propertyAddress: "12 Acacia Avenue, Leeds",
        alertType: "EPC",
      }),
    );
    expect(html).toContain("12 Acacia Avenue, Leeds");
    expect(html).toContain("EPC");
    expect(html).toMatch(/14 days/);
    expect(html).toContain("https://app.propmanage.app/compliance");
  });
});
