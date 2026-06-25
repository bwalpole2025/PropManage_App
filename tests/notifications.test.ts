import { describe, it, expect, beforeEach } from "vitest";
import { recipientIds } from "@/lib/notifications/service";
import { MockEmailSender, getOutbox, clearOutbox } from "@/lib/email/mock";
import { operationalAlertEmail } from "@/lib/email/templates";
import { parseNotificationPrefs } from "@/lib/notifications";

describe("recipientIds (notification fan-out)", () => {
  it("includes the principal and dedupes members", () => {
    expect(recipientIds("u1", ["u2", "u1", "u3"]).sort()).toEqual(["u1", "u2", "u3"]);
  });
  it("handles a missing principal", () => {
    expect(recipientIds(null, ["u2"])).toEqual(["u2"]);
    expect(recipientIds(undefined, [])).toEqual([]);
  });
});

describe("operational alert email + prefs gate", () => {
  beforeEach(() => clearOutbox());

  it("renders the subject + heading + body", () => {
    const e = operationalAlertEmail({
      subject: "Rent overdue — PropManage",
      heading: "Rent overdue",
      body: "£500.00 overdue by 3 days",
      href: "/transactions",
    });
    expect(e.subject).toBe("Rent overdue — PropManage");
    expect(e.text).toContain("£500.00 overdue");
    expect(e.html).toContain("Rent overdue");
  });

  it("records to the mock outbox", async () => {
    const sender = new MockEmailSender();
    await sender.sendOperationalAlert({
      to: "landlord@example.com",
      subject: "S",
      heading: "H",
      body: "B",
    });
    expect(getOutbox()).toHaveLength(1);
    expect(getOutbox()[0].to).toBe("landlord@example.com");
  });

  it("rentAndArrears pref controls the email (default on)", () => {
    expect(parseNotificationPrefs({}).rentAndArrears).toBe(true);
    expect(parseNotificationPrefs({ rentAndArrears: false }).rentAndArrears).toBe(false);
  });
});
