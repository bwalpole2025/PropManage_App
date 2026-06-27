import { describe, it, expect } from "vitest";
import { ComplianceRag } from "@/lib/enums";
import { DAY_MS } from "@/lib/compliance/rules";
import {
  addMonths,
  addYears,
  isoDate,
  monthYear,
  gasSafetyStatus,
  eicrStatus,
  certificateExpiry,
  GAS_SAFETY_RENEWAL,
  depositProtectionStatus,
  depositActionRequired,
  rentIncreaseClock,
  canServeRentIncrease,
  rentIncreaseUnlockDate,
  evictionGroundStatus,
  isWithinProtectedPeriod,
  protectedPeriodEnds,
  ProtectedEvictionGround,
  taxRoadmapStatus,
  mtdMandationMilestone,
} from "@/lib/compliance/complianceUtils";
import {
  assertEvictionGroundAllowed,
  ComplianceError,
} from "@/services/compliance/guards";

const NOW = new Date("2026-06-26T00:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY_MS);

describe("calendar arithmetic", () => {
  it("adds months and clamps to the last valid day", () => {
    expect(isoDate(addMonths(new Date("2026-01-31T00:00:00Z"), 1))).toBe(
      "2026-02-28",
    );
    expect(isoDate(addMonths(new Date("2026-06-26T00:00:00Z"), 12))).toBe(
      "2027-06-26",
    );
  });
  it("adds years and handles a leap day", () => {
    expect(isoDate(addYears(new Date("2024-02-29T00:00:00Z"), 1))).toBe(
      "2025-02-28",
    );
    expect(isoDate(addYears(new Date("2026-06-26T00:00:00Z"), 5))).toBe(
      "2031-06-26",
    );
  });
  it("formats a month/year label", () => {
    expect(monthYear(new Date(Date.UTC(2026, 3, 6)))).toBe("April 2026");
  });
});

describe("Gas Safety (12-month renewal, warn 30 days before expiry)", () => {
  it("is action_required (RED) with no record on file", () => {
    const s = gasSafetyStatus(null, NOW);
    expect(s.rag).toBe(ComplianceRag.RED);
    expect(s.state).toBe("action_required");
    expect(s.label).toBe("Missing");
  });
  it("is compliant when renewed well within the last 12 months", () => {
    const renewed = addMonths(NOW, -2);
    const s = gasSafetyStatus(renewed, NOW);
    expect(s.rag).toBe(ComplianceRag.GREEN);
    expect(s.dueDate).toEqual(certificateExpiry(renewed, GAS_SAFETY_RENEWAL));
  });
  it("warns (AMBER) within 30 days of expiry", () => {
    const renewed = addMonths(inDays(15), -12); // expiry ≈ 15 days out
    const s = gasSafetyStatus(renewed, NOW);
    expect(s.rag).toBe(ComplianceRag.AMBER);
    expect(s.state).toBe("due_soon");
    expect(s.daysRemaining).toBe(15);
  });
  it("is action_required once expired (renewed > 12 months ago)", () => {
    const s = gasSafetyStatus(addMonths(NOW, -13), NOW);
    expect(s.rag).toBe(ComplianceRag.RED);
    expect(s.label).toBe("Expired");
    expect(s.daysRemaining).toBeLessThan(0);
  });
});

describe("EICR (5-year renewal)", () => {
  it("is compliant a year after renewal", () => {
    expect(eicrStatus(addMonths(NOW, -12), NOW).rag).toBe(ComplianceRag.GREEN);
  });
  it("is action_required after 5 years", () => {
    const s = eicrStatus(addYears(NOW, -6), NOW);
    expect(s.rag).toBe(ComplianceRag.RED);
    expect(s.state).toBe("action_required");
  });
});

describe("deposit protection tracker", () => {
  it("flags a missing received date", () => {
    const s = depositProtectionStatus(
      { receivedDate: null, prescribedInfoServedDate: null },
      NOW,
    );
    expect(s.rag).toBe(ComplianceRag.RED);
    expect(s.label).toBe("Missing date");
  });
  it("is compliant once the Prescribed Information is served", () => {
    const s = depositProtectionStatus(
      { receivedDate: inDays(-40), prescribedInfoServedDate: inDays(-35) },
      NOW,
    );
    expect(s.rag).toBe(ComplianceRag.GREEN);
  });
  it("is due_soon while inside the 30-day window", () => {
    const s = depositProtectionStatus(
      { receivedDate: inDays(-10), prescribedInfoServedDate: null },
      NOW,
    );
    expect(s.rag).toBe(ComplianceRag.AMBER);
    expect(s.dueDate).toEqual(inDays(20)); // received + 30 days
    expect(depositActionRequired(
      { receivedDate: inDays(-10), prescribedInfoServedDate: null },
      NOW,
    )).toBe(false);
  });
  it("is action_required when PI is blank AND > 30 days elapsed", () => {
    const input = { receivedDate: inDays(-40), prescribedInfoServedDate: null };
    const s = depositProtectionStatus(input, NOW);
    expect(s.rag).toBe(ComplianceRag.RED);
    expect(s.state).toBe("action_required");
    expect(depositActionRequired(input, NOW)).toBe(true);
  });
});

describe("Section 13 rent-increase clock", () => {
  it("is available when nothing has been served", () => {
    const c = rentIncreaseClock(null, NOW);
    expect(c.locked).toBe(false);
    expect(c.rag).toBe(ComplianceRag.GREEN);
    expect(canServeRentIncrease(null, NOW)).toBe(true);
  });
  it("locks out a new increase for 12 months after one is served", () => {
    const last = addMonths(NOW, -2);
    const c = rentIncreaseClock(last, NOW);
    expect(c.locked).toBe(true);
    expect(c.rag).toBe(ComplianceRag.AMBER);
    expect(c.unlockDate).toEqual(rentIncreaseUnlockDate(last));
    expect(c.daysRemaining).toBeGreaterThan(0);
    expect(canServeRentIncrease(last, NOW)).toBe(false);
  });
  it("re-opens once 12 months have passed", () => {
    const last = addMonths(NOW, -13);
    expect(rentIncreaseClock(last, NOW).locked).toBe(false);
    expect(canServeRentIncrease(last, NOW)).toBe(true);
  });
});

describe("moving-in / selling protected period (first 12 months)", () => {
  it("blocks a Ground 1 / 1A notice inside the first 12 months", () => {
    const start = addMonths(NOW, -3);
    const s = evictionGroundStatus(
      { tenancyStartDate: start, ground: ProtectedEvictionGround.MOVING_IN },
      NOW,
    );
    expect(s.allowed).toBe(false);
    expect(s.rag).toBe(ComplianceRag.RED);
    expect(s.dueDate).toEqual(protectedPeriodEnds(start));
    expect(isWithinProtectedPeriod(start, NOW)).toBe(true);
  });
  it("allows it once the tenancy is past 12 months", () => {
    const start = addMonths(NOW, -13);
    const s = evictionGroundStatus(
      { tenancyStartDate: start, ground: ProtectedEvictionGround.SELLING },
      NOW,
    );
    expect(s.allowed).toBe(true);
    expect(s.rag).toBe(ComplianceRag.GREEN);
    expect(isWithinProtectedPeriod(start, NOW)).toBe(false);
  });
  it("the write guard throws inside the protected period, not after", () => {
    expect(() =>
      assertEvictionGroundAllowed(
        addMonths(NOW, -3),
        ProtectedEvictionGround.MOVING_IN,
        NOW,
      ),
    ).toThrow(ComplianceError);
    expect(() =>
      assertEvictionGroundAllowed(
        addMonths(NOW, -13),
        ProtectedEvictionGround.SELLING,
        NOW,
      ),
    ).not.toThrow();
  });
});

describe("Making Tax Digital roadmap", () => {
  it("maps income to the earliest applicable mandation milestone", () => {
    expect(mtdMandationMilestone(60_000_00)?.thresholdLabel).toBe("£50,000");
    // Exactly £50,000 is not "over" £50,000 → falls to the £30,000 step.
    expect(mtdMandationMilestone(50_000_00)?.thresholdLabel).toBe("£30,000");
    expect(mtdMandationMilestone(25_000_00)?.thresholdLabel).toBe("£20,000");
    expect(mtdMandationMilestone(10_000_00)).toBeNull();
  });
  it("flags a >£50k landlord as required now (in force since April 2026)", () => {
    const s = taxRoadmapStatus(60_000_00, NOW);
    expect(s.state).toBe("action_required");
    expect(s.thresholdPence).toBe(50_000_00);
    expect(s.alerts.join(" ")).toContain("over £50,000");
    expect(s.alerts.join(" ")).toContain("drops to £30,000");
  });
  it("warns a £40k landlord about the April 2027 threshold", () => {
    const s = taxRoadmapStatus(40_000_00, NOW);
    expect(s.state).toBe("due_soon");
    expect(s.thresholdPence).toBe(30_000_00);
  });
  it("puts a £25k landlord on the horizon (April 2028)", () => {
    const s = taxRoadmapStatus(25_000_00, NOW);
    expect(s.state).toBe("compliant");
    expect(s.effectiveDate).toEqual(new Date(Date.UTC(2028, 3, 6)));
  });
  it("treats a sub-£20k landlord as not yet required", () => {
    const s = taxRoadmapStatus(10_000_00, NOW);
    expect(s.rag).toBe(ComplianceRag.GREEN);
    expect(s.thresholdPence).toBeNull();
  });
});
