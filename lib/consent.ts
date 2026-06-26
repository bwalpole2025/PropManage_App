// Privacy-first cookie consent. The app sets only strictly-necessary cookies
// (auth session, active-entity, sidebar state) by default; anything non-essential
// (e.g. future analytics) must wait for an explicit "accept all". This module is
// CLIENT-SAFE (no server imports) and reads/writes the choice via document.cookie.

export const CONSENT_COOKIE = "pm_cookie_consent";
export const CONSENT_VERSION = 1;

export type ConsentChoice = "all" | "essential";

export interface ConsentRecord {
  choice: ConsentChoice;
  v: number;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Read the stored consent record (client-only). null = no choice made yet. */
export function readConsent(): ConsentRecord | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
    if (parsed && (parsed.choice === "all" || parsed.choice === "essential")) {
      return { choice: parsed.choice, v: Number(parsed.v) || 0 };
    }
  } catch {
    // legacy/garbled value — treat as no choice
  }
  return null;
}

/** Persist a consent choice for a year (client-only). */
export function writeConsent(choice: ConsentChoice): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(
    JSON.stringify({ choice, v: CONSENT_VERSION } satisfies ConsentRecord),
  );
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

/** Clear the stored choice so the banner is shown again (client-only). */
export function clearConsent(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Whether a current-version choice exists (vs needing the banner). */
export function hasCurrentConsent(record: ConsentRecord | null): boolean {
  return !!record && record.v === CONSENT_VERSION;
}
