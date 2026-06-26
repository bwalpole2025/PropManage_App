// Standalone MTD acceptance drive against the faithful MOCK provider (no live
// HMRC creds needed). Proves the literal acceptance: authorise -> list
// obligations -> submit a quarterly update -> display the returned calculation,
// plus EOPS + final declaration. Run:
//   HMRC_MTD_MODE=mock NODE_ENV=test npx tsx scripts/drive-mtd.ts
import assert from "node:assert/strict";
import { services } from "@/lib/services";
import { taxYearLabelFor } from "@/lib/format";

async function main() {
  const entityId = "drive-entity";
  const taxYear = taxYearLabelFor();
  const redirectUri = "http://localhost:3100/api/mtd/callback";

  // (1) AUTHORISE (OAuth-shaped) + token exchange
  const authUrl = services.hmrc.getAuthorizationUrl({ entityId, redirectUri, state: "drive-state" });
  assert.ok(/state=/.test(authUrl) && /(redirect_uri|mockAuth)/.test(authUrl), "authorize URL is OAuth-shaped");
  const ex = await services.hmrc.exchangeCode({ entityId, code: "mock-auth-code", redirectUri });
  assert.ok(ex.connectionId && ex.expiresAt, "exchangeCode returns connectionId + expiry");
  console.log("✅ authorised:", authUrl.slice(0, 48) + "…");

  // (2) INCOME SOURCES + OBLIGATIONS (with periods + deadlines)
  const sources = await services.hmrc.listIncomeSources({ entityId });
  const business = sources.find((s) => s.typeOfBusiness === "uk-property");
  assert.ok(business?.businessId, "a uk-property businessId is returned");
  const obligations = await services.hmrc.getObligations({ entityId, taxYear });
  assert.ok(obligations.length >= 4, ">=4 obligations listed");
  for (const o of obligations) assert.ok(o.startDate && o.endDate && o.dueDate, "obligation has period + deadline");
  const q1 = obligations.find((o) => o.periodKey.endsWith("-Q1"))!;
  assert.equal(q1.status, "OPEN", "Q1 starts OPEN");
  console.log(`✅ obligations: ${obligations.length} (business ${business!.businessId})`);

  // (3) SUBMIT A QUARTERLY UPDATE (period summary compiled from categorised txns)
  const summary = {
    taxYear,
    periodKey: q1.periodKey,
    income: { rentIncome: 1_200_000, premiumsOfLeaseGrant: 0, otherPropertyIncome: 0 },
    expenses: { premisesRunningCosts: 150_000, repairsAndMaintenance: 80_000, financialCosts: 0, professionalFees: 0, costOfServices: 0, other: 0 },
  };
  const sub = await services.hmrc.submitQuarterlyUpdate({ entityId, periodKey: q1.periodKey, summary });
  assert.equal(sub.status, "ACCEPTED", "quarterly update ACCEPTED");
  assert.ok(sub.receiptId, "non-empty HMRC receipt id");
  const after = await services.hmrc.getObligations({ entityId, taxYear });
  assert.equal(after.find((o) => o.periodKey === q1.periodKey)!.status, "FULFILLED", "Q1 flips to FULFILLED");
  console.log(`✅ quarterly update ACCEPTED: receipt ${sub.receiptId}`);

  // (4) DISPLAY THE RETURNED CALCULATION (async trigger + poll)
  const { calculationId } = await services.hmrc.triggerCalculation({ entityId, taxYear });
  assert.ok(calculationId, "triggerCalculation returns a calculationId");
  let calc = await services.hmrc.getCalculation({ entityId, taxYear, calculationId });
  let attempts = 0;
  while (calc.status === "PENDING" && attempts++ < 15) {
    calc = await services.hmrc.getCalculation({ entityId, taxYear, calculationId });
  }
  assert.equal(calc.status, "READY", "calculation becomes READY");
  assert.ok((calc.incomeTaxAndNicsDuePence ?? 0) > 0, "a non-zero tax-due figure to display");
  console.log(`✅ calculation READY: tax due £${((calc.incomeTaxAndNicsDuePence ?? 0) / 100).toFixed(2)}`);

  // (5) EOPS + FINAL DECLARATION
  const eops = await services.hmrc.submitEops({ entityId, taxYear, businessId: business!.businessId });
  assert.equal(eops.status, "ACCEPTED", "EOPS ACCEPTED");
  const finalCalc = await services.hmrc.triggerCalculation({ entityId, taxYear, calculationType: "final-declaration" });
  const fin = await services.hmrc.submitFinalDeclaration({ entityId, taxYear, calculationId: finalCalc.calculationId });
  assert.equal(fin.status, "ACCEPTED", "final declaration ACCEPTED");
  console.log(`✅ EOPS receipt ${eops.receiptId}; final declaration receipt ${fin.receiptId}`);

  console.log("\n==== MTD ACCEPTANCE DRIVE PASSED ====");
}

main().catch((e) => {
  console.error("DRIVE FAILED:", e);
  process.exit(1);
});
