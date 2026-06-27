// Closed-beta allowlist. During the closed beta only a fixed set of approved
// emails may authenticate. The set is configured via the BETA_TESTER_EMAILS
// environment variable (a comma-separated list), so it can be changed without a
// code deploy.
//
// Edge-safe by design: this only reads process.env and does string work, so it
// can be imported by both the Node auth config (lib/auth/index.ts) and the Edge
// middleware (middleware.ts).

/** The configured beta-tester emails, lower-cased and de-duplicated. */
export function betaAllowlist(): string[] {
  const raw = process.env.BETA_TESTER_EMAILS ?? "";
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

/** Whether `email` is on the closed-beta allowlist. */
export function isBetaAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return betaAllowlist().includes(email.trim().toLowerCase());
}
