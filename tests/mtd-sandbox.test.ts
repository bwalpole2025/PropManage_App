import { describe, it, expect } from "vitest";
import { services } from "@/lib/services";
import { ObligationType, SubmissionStatus } from "@/lib/enums";
import type { PropertyIncomeSummary } from "@/lib/services/types";

// Integration test against the HMRC MTD sandbox via the mock provider (the same
// clean interface a real HMRC adapter implements). Exercises the end-to-end
// obligation → submit → calculation → final-declaration cycle through `services.hmrc`.

const ENTITY = "test-entity";
const TAX_YEAR = "2025-26";

function summary(periodKey: string): PropertyIncomeSummary {
  return {
    taxYear: TAX_YEAR,
    periodKey,
    income: {
      rentIncome: 1_200_000,
      premiumsOfLeaseGrant: 0,
      otherPropertyIncome: 0,
    },
    expenses: {
      premisesRunningCosts: 120_000,
      repairsAndMaintenance: 80_000,
      financialCosts: 300_000,
      professionalFees: 20_000,
      costOfServices: 0,
      other: 0,
    },
  };
}

describe("HMRC MTD sandbox (mock provider integration)", () => {
  it("returns the four quarterly obligations plus a final declaration", async () => {
    const all = await services.hmrc.getObligations({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
    });
    expect(all).toHaveLength(5);

    const quarters = all.filter(
      (o) => o.type === ObligationType.QUARTERLY_UPDATE,
    );
    const finals = all.filter(
      (o) => o.type === ObligationType.FINAL_DECLARATION,
    );
    expect(quarters).toHaveLength(4);
    expect(finals).toHaveLength(1);

    // Each obligation carries a coherent period window.
    for (const o of all) {
      expect(new Date(o.startDate).getTime()).toBeLessThan(
        new Date(o.endDate).getTime(),
      );
      expect(o.periodKey).toBeTruthy();
    }
  });

  it("filters obligations by type", async () => {
    const onlyQuarters = await services.hmrc.getObligations({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
      type: ObligationType.QUARTERLY_UPDATE,
    });
    expect(onlyQuarters).toHaveLength(4);
    expect(
      onlyQuarters.every((o) => o.type === ObligationType.QUARTERLY_UPDATE),
    ).toBe(true);
  });

  it("starts the OAuth authorize flow carrying a single-use state nonce", () => {
    // The provider owns token exchange + encrypted persistence behind the
    // interface; the authorize URL is the pure, DB-free entry point we assert on.
    const url = services.hmrc.getAuthorizationUrl({
      entityId: ENTITY,
      redirectUri: "/mtd/callback",
      state: "nonce-123",
    });
    expect(url).toContain("nonce-123");
  });

  it("submits a quarterly update and gets an ACCEPTED receipt", async () => {
    const quarters = await services.hmrc.getObligations({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
      type: ObligationType.QUARTERLY_UPDATE,
    });
    const periodKey = quarters[0].periodKey;

    const res = await services.hmrc.submitQuarterlyUpdate({
      entityId: ENTITY,
      periodKey,
      summary: summary(periodKey),
    });
    expect(res.status).toBe(SubmissionStatus.ACCEPTED);
    expect(res.receiptId).toMatch(/HMRC-RECEIPT-/);
    expect(res.submissionId).toBeTruthy();
  });

  it("triggers a calculation, then submits a final declaration", async () => {
    const { calculationId } = await services.hmrc.triggerCalculation({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
    });
    expect(calculationId).toBeTruthy();

    const calc = await services.hmrc.getCalculation({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
      calculationId,
    });
    expect(calc.calculationId).toBe(calculationId);
    expect(calc.taxYear).toBe(TAX_YEAR);

    const res = await services.hmrc.submitFinalDeclaration({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
      calculationId,
    });
    expect(res.status).toBe(SubmissionStatus.ACCEPTED);
    expect(res.receiptId).toMatch(/HMRC-RECEIPT-/);
  });

  it("issues distinct receipt ids across submissions", async () => {
    const first = await services.hmrc.submitFinalDeclaration({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
      calculationId: "calc-a",
    });
    const second = await services.hmrc.submitFinalDeclaration({
      entityId: ENTITY,
      taxYear: TAX_YEAR,
      calculationId: "calc-b",
    });
    expect(first.receiptId).not.toBe(second.receiptId);
  });
});
