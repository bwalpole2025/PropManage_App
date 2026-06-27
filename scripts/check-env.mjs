// Production env guard — fails the Vercel *production* build when any critical
// environment variable is missing, so a misconfigured deploy never ships.
//
// Wired into the build via package.json ("prebuild" + "check-env") and the
// vercel.json buildCommand, where it runs BEFORE `prisma migrate deploy` so a
// missing DATABASE_URL fails fast with a clear message.
//
// Scope:
//   • Enforced (exit 1) only for Vercel Production  (VERCEL_ENV === "production"),
//     or when CHECK_ENV=1 is set to enforce locally.
//   • Preview/local builds print the same report as a warning but exit 0, so
//     day-to-day builds and preview deploys aren't blocked by the full live set.
//   • SKIP_ENV_CHECK=1 bypasses the check entirely (emergency escape hatch).
//
// Grouped by integration so a failure points straight at what to fix in
// Vercel → Project → Settings → Environment Variables (Production).

const REQUIRED_GROUPS = {
  "Core / Auth": ["AUTH_SECRET", "APP_URL", "NEXTAUTH_URL"],
  "Supabase — Postgres": ["DATABASE_URL"],
  "Supabase — Storage (S3)": [
    "S3_ENDPOINT",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ],
  "TrueLayer (Live)": [
    "TRUELAYER_CLIENT_ID",
    "TRUELAYER_CLIENT_SECRET",
    "TRUELAYER_ENV",
    "TRUELAYER_REDIRECT_URI",
    "TRUELAYER_KID",
    "TRUELAYER_PRIVATE_KEY",
    "TOKEN_ENC_KEY",
  ],
  Resend: ["RESEND_API_KEY", "EMAIL_FROM"],
  "Beta Allowlist": ["BETA_TESTER_EMAILS"],
};

const isSet = (name) => {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "";
};

const skipped = process.env.SKIP_ENV_CHECK === "1";
const enforce =
  !skipped &&
  (process.env.VERCEL_ENV === "production" || process.env.CHECK_ENV === "1");

if (skipped) {
  console.log("• check-env: skipped (SKIP_ENV_CHECK=1).");
  process.exit(0);
}

const missing = Object.entries(REQUIRED_GROUPS)
  .map(([group, vars]) => [group, vars.filter((v) => !isSet(v))])
  .filter(([, absent]) => absent.length > 0);

// High-entropy secrets must also be *strong*, not just present — a short or
// placeholder value that is "set" still ships (e.g. a guessable AUTH_SECRET
// enables NextAuth JWT session forgery; a weak TOKEN_ENC_KEY weakens token
// encryption). Require at least 32 characters.
const MIN_SECRET_LEN = { AUTH_SECRET: 32, TOKEN_ENC_KEY: 32 };
const weak = Object.keys(MIN_SECRET_LEN)
  .filter((name) => isSet(name) && process.env[name].trim().length < MIN_SECRET_LEN[name])
  .map((name) => `${name} (set but shorter than ${MIN_SECRET_LEN[name]} characters)`);

const problems = [...missing];
if (weak.length) problems.push(["Weak / placeholder secrets", weak]);

if (problems.length === 0) {
  console.log(
    "✓ check-env: all critical production environment variables are set and strong.",
  );
  process.exit(0);
}

const report = problems
  .map(
    ([group, absent]) =>
      `  ${group}:\n${absent.map((v) => `    - ${v}`).join("\n")}`,
  )
  .join("\n");

if (enforce) {
  console.error(
    `\n✗ check-env: missing required production environment variable(s):\n${report}\n\n` +
      "Set them in Vercel → Project → Settings → Environment Variables (Production), " +
      "then redeploy.\n",
  );
  process.exit(1);
}

console.warn(
  `\n⚠ check-env: the following variables are not set (VERCEL_ENV=` +
    `${process.env.VERCEL_ENV ?? "unset"}, not a production build — continuing):\n${report}\n\n` +
    "Set CHECK_ENV=1 to enforce this locally.\n",
);
process.exit(0);
