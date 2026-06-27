import { describe, it, expect, beforeEach } from "vitest";
import { recipientIds } from "@/lib/notifications/service";
import { MockEmailSender, getOutbox, clearOutbox } from "@/lib/email/mock";
import { operationalAlertEmail } from "@/lib/email/templates";
import {
  parseNotificationPrefs,
  resolveDeliveryChannels,
  DEFAULT_NOTIFICATION_PREFS,
  NotificationCategory,
  NotificationChannel,
} from "@/lib/notifications";

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

  it("rentAndArrears category defaults on and honours a stored false", () => {
    expect(parseNotificationPrefs({}).categories.rentAndArrears).toBe(true);
    expect(
      parseNotificationPrefs({ categories: { rentAndArrears: false } })
        .categories.rentAndArrears,
    ).toBe(false);
  });
});

// The acceptance criterion, at the level of the pure rule the dispatcher applies:
// "exactly one reminder per configured channel; disabling a preference suppresses it."
describe("resolveDeliveryChannels (per-channel delivery contract)", () => {
  const ALL = [NotificationChannel.inApp, NotificationChannel.email];

  it("delivers on every configured channel for an enabled category", () => {
    const prefs = parseNotificationPrefs({
      channels: { inApp: true, email: true },
    });
    const channels = resolveDeliveryChannels(
      prefs,
      NotificationCategory.complianceReminders,
    );
    expect(channels.sort()).toEqual([...ALL].sort());
    // No duplicates → exactly one delivery per channel.
    expect(new Set(channels).size).toBe(channels.length);
  });

  it("disabling a single channel suppresses just that channel", () => {
    const prefs = parseNotificationPrefs({
      channels: { inApp: true, email: false },
    });
    const channels = resolveDeliveryChannels(
      prefs,
      NotificationCategory.complianceReminders,
    );
    expect(channels).not.toContain(NotificationChannel.email);
    expect(channels).toContain(NotificationChannel.inApp);
  });

  it("disabling the category suppresses delivery on all channels", () => {
    const prefs = parseNotificationPrefs({
      channels: { inApp: true, email: true },
      categories: { complianceReminders: false },
    });
    expect(
      resolveDeliveryChannels(prefs, NotificationCategory.complianceReminders),
    ).toEqual([]);
    // Other categories are unaffected.
    expect(
      resolveDeliveryChannels(prefs, NotificationCategory.rentAndArrears).length,
    ).toBe(2);
  });

  it("the default prefs deliver compliance on in-app + email", () => {
    const channels = resolveDeliveryChannels(
      DEFAULT_NOTIFICATION_PREFS,
      NotificationCategory.complianceReminders,
    );
    expect(channels).toEqual([
      NotificationChannel.inApp,
      NotificationChannel.email,
    ]);
  });
});
