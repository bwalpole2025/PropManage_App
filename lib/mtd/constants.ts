// MTD (Making Tax Digital for Income Tax) constants. Kept OUT of lib/enums.ts so
// this changeset stays isolated from concurrent work on that file. DB columns
// that hold these are plain `String`, so new values (e.g. the EOPS submission
// type) need no enum/schema change.

/** OAuth2 scopes for the HMRC self-assessment (MTD ITSA) APIs. */
export const MTD_SCOPES = ["read:self-assessment", "write:self-assessment"] as const;

/** HMRC sandbox OAuth authorize page (the user enters their Gateway ID HERE, never in our app). */
export const HMRC_AUTHORIZE_URL =
  process.env.HMRC_AUTHORIZE_URL ??
  "https://test-www.tax.service.gov.uk/oauth/authorize";

/** Token endpoint path, relative to HMRC_BASE_URL (sandbox: test-api.service.hmrc.gov.uk). */
export const HMRC_TOKEN_PATH = "/oauth/token";

/** HMRC API version negotiation header value. */
export const HMRC_ACCEPT = "application/vnd.hmrc.2.0+json";

/** Where HMRC redirects back to after authorization. Must be allow-listed in the HMRC app config. */
export const MTD_REDIRECT_PATH = "/api/mtd/callback";

/** Submission.type for an End-of-Period Statement (no enum entry exists; stored as a plain string). */
export const SUBMISSION_TYPE_EOPS = "EOPS";

/** HMRC tax-calculation lifecycle (async: trigger then poll the result). */
export const CalcStatus = {
  PENDING: "PENDING",
  READY: "READY",
  ERROR: "ERROR",
} as const;
export type CalcStatus = (typeof CalcStatus)[keyof typeof CalcStatus];

/** Calculation kind — an in-year estimate vs the crystallised final figure. */
export const CalcKind = {
  ESTIMATE: "estimate",
  CRYSTALLISED: "crystallised",
} as const;
export type CalcKind = (typeof CalcKind)[keyof typeof CalcKind];

/** OAuth state validity window (CSRF token). */
export const OAUTH_STATE_TTL_MS = 10 * 60_000; // 10 minutes

/** Client-side polling of the async calculation. */
export const CALC_POLL_INTERVAL_MS = 1_500;
export const CALC_POLL_MAX_ATTEMPTS = 20;

/** Fraud-prevention vendor identity (Gov-Vendor-* headers). */
export const GOV_VENDOR_PRODUCT_NAME = "PropManage";
export const GOV_VENDOR_VERSION = `propmanage=${process.env.npm_package_version ?? "0.1.0"}`;

/** HMRC business "type of business" -> property API path segment. */
export const BUSINESS_TYPE_PATH: Record<string, string> = {
  "uk-property": "uk",
  "foreign-property": "foreign",
};

/**
 * Convert a tax-year label ("2025-26") into the ISO from/to dates HMRC expects
 * for the year (6 Apr -> 5 Apr). Quarterly period dates come from the obligation.
 */
export function taxYearToFromTo(label: string): { from: string; to: string } {
  const startYear = Number.parseInt(label.slice(0, 4), 10);
  const from = new Date(Date.UTC(startYear, 3, 6)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(startYear + 1, 3, 5)).toISOString().slice(0, 10);
  return { from, to };
}
