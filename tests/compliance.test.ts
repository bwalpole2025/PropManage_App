import { describe, it, expect } from "vitest";
import { ComplianceRag } from "@/lib/enums";
import {
  ragForExpiry,
  worstRag,
  tierForOffset,
  computeHazardDeadlines,
  computePetDeadline,
  depositDeadline,
  maxRentInAdvancePence,
  DAY_MS,
} from "@/lib/compliance/rules";
import {
  assertAssuredPeriodic,
  assertRentInAdvanceWithinCap,
  ComplianceError,
} from "@/services/compliance/guards";

const NOW = new Date("2026-06-26T00:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY_MS);

describe("RAG for an expiring item", () => {
  it("is GREEN well before expiry, AMBER within 30 days, RED once past", () => {
    expect(ragForExpiry(inDays(90), NOW)).toBe(ComplianceRag.GREEN);
    expect(ragForExpiry(inDays(30), NOW)).toBe(ComplianceRag.AMBER);
    expect(ragForExpiry(inDays(1), NOW)).toBe(ComplianceRag.AMBER);
    expect(ragForExpiry(inDays(-1), NOW)).toBe(ComplianceRag.RED);
  });
  it("treats a missing date as RED (never silently compliant)", () => {
    expect(ragForExpiry(null, NOW)).toBe(ComplianceRag.RED);
  });
  it("worstRag picks the most severe", () => {
    expect(worstRag([ComplianceRag.GREEN, ComplianceRag.AMBER])).toBe(ComplianceRag.AMBER);
    expect(worstRag([ComplianceRag.AMBER, ComplianceRag.RED])).toBe(ComplianceRag.RED);
    expect(worstRag([])).toBe(ComplianceRag.GREEN);
  });
});

describe("reminder escalation tiers", () => {
  it("maps offsets to First/Second/Final/Urgent", () => {
    expect(tierForOffset(30)).toBe("FIRST");
    expect(tierForOffset(14)).toBe("SECOND");
    expect(tierForOffset(7)).toBe("FINAL");
    expect(tierForOffset(0)).toBe("URGENT");
    expect(tierForOffset(-5)).toBe("URGENT");
  });
});

describe("Awaab's Law SLA windows", () => {
  it("gives emergencies a 24h window and standard hazards a longer one", () => {
    const emerg = computeHazardDeadlines("EMERGENCY", NOW);
    expect(emerg.investigateByDate.getTime()).toBe(inDays(1).getTime());
    const std = computeHazardDeadlines("STANDARD", NOW);
    expect(std.repairStartByDate.getTime()).toBe(inDays(28).getTime());
  });
});

describe("pet + deposit deadlines", () => {
  it("pet response is 28 days (42 when more info requested)", () => {
    expect(computePetDeadline(NOW).getTime()).toBe(inDays(28).getTime());
    expect(computePetDeadline(NOW, true).getTime()).toBe(inDays(42).getTime());
  });
  it("deposit must be protected within 30 days of receipt", () => {
    expect(depositDeadline(NOW).getTime()).toBe(inDays(30).getTime());
  });
});

describe("RRA write guards", () => {
  it("rejects a fixed-term tenancy (end date or non-periodic type)", () => {
    expect(() => assertAssuredPeriodic({ endDate: "2027-06-26" })).toThrow(ComplianceError);
    expect(() => assertAssuredPeriodic({ agreementType: "LEGACY_FIXED" })).toThrow(
      ComplianceError,
    );
  });
  it("allows an assured periodic tenancy with no end date", () => {
    expect(() =>
      assertAssuredPeriodic({ agreementType: "ASSURED_PERIODIC", endDate: null }),
    ).not.toThrow();
  });
  it("caps rent in advance at one rent period", () => {
    expect(maxRentInAdvancePence(120_000)).toBe(120_000);
    expect(() => assertRentInAdvanceWithinCap(120_000, 120_000)).not.toThrow();
    expect(() => assertRentInAdvanceWithinCap(240_000, 120_000)).toThrow(ComplianceError);
  });
});

import { complianceAlertEmail } from "@/lib/email/templates";

describe("compliance alert email template", () => {
  it("renders property, item, deadline and penalty with a RAG accent + CTA", () => {
    const mail = complianceAlertEmail({
      name: "Jordan",
      subject: "URGENT: Gas Safety Certificate has expired",
      tierLabel: "URGENT: compliance breach",
      rag: "RED",
      itemLabel: "Gas Safety Certificate",
      propertyLabel: "12 Mock Street",
      deadlineText: "Expired 2026-06-20",
      penalty: "Criminal liability with an unlimited fine.",
      href: "/compliance",
    });
    expect(mail.subject).toContain("Gas Safety");
    expect(mail.html).toContain("12 Mock Street");
    expect(mail.html).toContain("Gas Safety Certificate");
    expect(mail.html).toContain("Expired 2026-06-20");
    expect(mail.html).toContain("unlimited fine");
    expect(mail.html).toContain("#b91c1c"); // RED accent
    expect(mail.html).toContain('href="/compliance"');
    expect(mail.text).toContain("Property: 12 Mock Street");
  });
  it("escapes HTML in user-supplied values", () => {
    const mail = complianceAlertEmail({
      subject: "s",
      tierLabel: "First warning",
      rag: "AMBER",
      itemLabel: "EPC",
      propertyLabel: '<script>alert(1)</script>',
      deadlineText: "Expires soon",
      penalty: "x",
    });
    expect(mail.html).not.toContain("<script>alert(1)</script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});
