import { describe, it, expect, vi, afterEach } from "vitest";
import { reportEmail } from "@/lib/email/templates";
import { ResendEmailSender } from "@/lib/email/resend";

describe("report email template", () => {
  it("renders the period, metrics table and notes", () => {
    const mail = reportEmail({
      name: "Jordan",
      subject: "PropManage report — June 2026",
      heading: "Your June 2026 portfolio report",
      periodLabel: "June 2026",
      metrics: [
        { label: "Net profit", value: "£1,250.00" },
        { label: "Arrears outstanding", value: "£0.00" },
      ],
      notes: ["All compliance items are up to date."],
      href: "/reports",
    });
    expect(mail.subject).toContain("June 2026");
    expect(mail.html).toContain("Your June 2026 portfolio report");
    expect(mail.html).toContain("Net profit");
    expect(mail.html).toContain("£1,250.00");
    expect(mail.html).toContain("All compliance items are up to date.");
    expect(mail.html).toContain('href="/reports"');
    expect(mail.text).toContain("Net profit: £1,250.00");
  });
});

describe("Resend transport", () => {
  const ORIGINAL_KEY = process.env.RESEND_API_KEY;
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = ORIGINAL_KEY;
    vi.unstubAllGlobals();
  });

  it("POSTs to the Resend API with bearer auth and returns the message id", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const fetchMock = vi.fn(async (_url: string, _opts: RequestInit) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ id: "msg_abc" }),
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const sender = new ResendEmailSender();
    const res = await sender.sendReport({
      to: "owner@example.com",
      subject: "Subject",
      heading: "Heading",
      periodLabel: "June 2026",
      metrics: [{ label: "Net", value: "£0.00" }],
    });

    expect(res.id).toBe("msg_abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(opts.method).toBe("POST");
    expect((opts.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_test_123",
    );
    const body = JSON.parse(opts.body as string);
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.subject).toBe("Subject");
    expect(body.html).toContain("June 2026");
  });

  it("surfaces a clear error when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const sender = new ResendEmailSender();
    await expect(
      sender.sendOperationalAlert({
        to: "x@y.com",
        subject: "s",
        heading: "h",
        body: "b",
      }),
    ).rejects.toThrow(/RESEND_API_KEY/);
  });
});
