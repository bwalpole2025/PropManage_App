# Closed‑beta deployment guide (Vercel + Supabase + Resend + TrueLayer Live)

How to put PropManage on the public web as an invite‑only closed beta for **four
testers**, with the **live** TrueLayer bank feed.

The app is **Next.js + NextAuth + Prisma/PostgreSQL**. In this deployment:

| Service | Role here | Notes |
| --- | --- | --- |
| **Vercel** | Hosts the Next.js web app | Auto‑runs `prisma migrate deploy` on every deploy (`vercel.json`) |
| **Supabase** | **Postgres database** (`DATABASE_URL`) **and** S3‑compatible **file storage** | NOT auth — auth is NextAuth + the beta allowlist |
| **Resend** | Transactional email (verification, reminders, reports) | |
| **TrueLayer (live)** | Real Open Banking bank feed | Live access needs TrueLayer's go‑live approval — see §3 |
| **Redis + worker** | Background sweeps & bank polling | Vercel can't run the long‑lived worker — host it separately (§4) |

The production build refuses to ship if any critical variable is missing
(`scripts/check-env.mjs`). The required groups are: Core/Auth, Supabase‑Postgres,
Supabase‑Storage(S3), TrueLayer(Live), Resend, Beta Allowlist. Every step below
maps to one of those.

> Order matters for one thing only: TrueLayer's redirect/webhook URLs must match
> your final domain. Easiest path: deploy to Vercel first to get the domain, then
> fill TrueLayer + the URL env vars and redeploy.

---

## 0. Generate the secrets you'll reuse

```bash
# Auth.js session secret (also signs the bank-feed OAuth state)
openssl rand -base64 33          # -> AUTH_SECRET

# Token-at-rest encryption key for bank/HMRC tokens (32+ chars)
openssl rand -base64 32          # -> TOKEN_ENC_KEY
```

Keep these in a password manager. Never commit them.

---

## 1. Supabase — Postgres database + file storage

1. Create a project at <https://supabase.com> (pick the **London / eu‑west‑2**
   region to sit next to Vercel's `lhr1`).
2. **Database connection string** — Project → *Connect* → ORMs/Prisma. Use the
   **Session pooler** string (host `…pooler.supabase.com`, port **5432**). It is
   pooled (safe for Vercel's serverless functions) **and** supports
   `prisma migrate deploy`. This becomes `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://postgres.<ref>:<db-password>@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require"
   ```
   *(Scaling later? Switch runtime to the transaction pooler on port 6543 with
   `?pgbouncer=true&connection_limit=1` and add a `directUrl` to
   `prisma/schema.prisma` for migrations. Not needed for a 4‑user beta.)*
3. **File storage (S3)** — Storage → create a bucket, e.g. `propmanage-files`
   (keep it **private**). Then Project Settings → Storage → **S3 access keys** →
   generate a key pair. This gives you:
   ```
   STORAGE_DRIVER="s3"
   S3_ENDPOINT="https://<ref>.supabase.co/storage/v1/s3"
   S3_REGION="eu-west-2"
   S3_BUCKET="propmanage-files"
   S3_ACCESS_KEY_ID="<from Supabase>"
   S3_SECRET_ACCESS_KEY="<from Supabase>"
   S3_FORCE_PATH_STYLE="true"
   ```

---

## 2. Resend — email

1. Sign up at <https://resend.com>, **Add domain**, and add the DNS records it
   shows (SPF/DKIM) at your domain registrar. Wait for "Verified".
2. API Keys → create one (Sending access).
3. Env:
   ```
   EMAIL_DRIVER="resend"
   RESEND_API_KEY="re_..."
   EMAIL_FROM="PropManage <no-reply@yourdomain.com>"   # MUST be on the verified domain
   SUPPORT_EMAIL="support@yourdomain.com"
   ```

---

## 3. TrueLayer — the LIVE Data API

> **Read this first.** Live Open Banking *data* access to real banks is gated by
> TrueLayer's **go‑live / app‑approval** process (TrueLayer is the regulated
> AISP; you onboard as their client). It is **not** an instant switch — budget
> days/weeks. Everything below works on **Sandbox** immediately if you want the
> beta live now and to flip to real banks once approved. Full backend detail is
> in `docs/TRUELAYER_SETUP.md`.

1. <https://console.truelayer.com> → create an application; open the **Live**
   credentials (separate from Sandbox): `client_id`, `client_secret`.
2. **Redirect URI** (must byte‑match your env): add
   `https://YOUR_DOMAIN/api/banking/truelayer/callback`.
3. **Data API** product enabled with scopes
   `info accounts balance transactions offline_access`
   (`offline_access` = the refresh token; without it the feed dies after ~1h).
4. **Webhook** destination: `https://YOUR_DOMAIN/api/webhooks/bank-feed`
   (verified against TrueLayer's public JWKS — no shared secret to copy).
5. **Request‑signing key** (the production env check requires `TRUELAYER_KID` +
   `TRUELAYER_PRIVATE_KEY`): generate an EC P‑521 key, upload the **public** half
   in the console to get the `kid`:
   ```bash
   openssl ecparam -genkey -name secp521r1 -noout -out ec-private.pem
   openssl ec -in ec-private.pem -pubout -out ec-public.pem   # upload this; get the kid
   ```
   Put the **private** PEM in `TRUELAYER_PRIVATE_KEY` (use `\n` escapes or a
   base64‑encoded PEM) and the returned `kid` in `TRUELAYER_KID`.
6. Env (live):
   ```
   BANK_FEED_PROVIDER="truelayer"     # opt in to the real feed
   SERVICE_MODE="live"
   TRUELAYER_ENV="live"
   TRUELAYER_CLIENT_ID="..."
   TRUELAYER_CLIENT_SECRET="..."
   TRUELAYER_REDIRECT_URI="https://YOUR_DOMAIN/api/banking/truelayer/callback"
   TRUELAYER_PROVIDERS="uk-ob-all uk-oauth-all"     # drop the uk-cs-mock sandbox bank
   TRUELAYER_WEBHOOK_JWKS_URL="https://webhooks.truelayer.com/.well-known/jwks"
   TRUELAYER_KID="..."
   TRUELAYER_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
   TOKEN_ENC_KEY="<from step 0>"      # the app refuses to start a real feed without it
   ```

*(HMRC Making Tax Digital is independent. Leave `HMRC_MTD_MODE="mock"` for the
beta unless you've onboarded an HMRC app too.)*

---

## 4. Redis + the background worker (polling, reminders)

Vercel is serverless and **cannot** run `npm run worker` (the long‑lived process
that polls TrueLayer and sends rent/compliance/MTD reminders + monthly reports).
The bank webhook gives a low‑latency nudge, but TrueLayer's Data API is
**polling‑driven**, so for a real bank feed you want the worker running.

1. Create a Redis instance (e.g. **Upstash** — free tier is fine).
2. Deploy the worker on any always‑on host (**Railway**/Render/Fly, or a small
   VM): start command `npm run worker`, with env:
   ```
   QUEUE_DRIVER="bullmq"
   REDIS_URL="rediss://...upstash..."
   DATABASE_URL=...           # same Supabase string as the web app
   # + the same TrueLayer*, TOKEN_ENC_KEY, Resend, AUTH_SECRET values
   ```
   One worker instance is enough — it schedules its own sweeps (`worker.ts`).

*(Minimal alternative for a tiny beta: skip the worker. Bank data then updates
only on webhook nudges and reminders won't auto‑send. Not recommended with a live
feed.)*

---

## 5. Vercel — deploy the web app

1. Push the repo to GitHub and **Import** it at <https://vercel.com> (framework
   auto‑detected as Next.js; `vercel.json` already sets `installCommand`,
   `buildCommand` = `check-env && prisma migrate deploy && next build`, region
   `lhr1`).
2. **Project → Settings → Environment Variables → Production**, add everything
   from steps 0–3 **plus**:
   ```
   AUTH_SECRET="<from step 0>"
   APP_URL="https://YOUR_DOMAIN"
   NEXTAUTH_URL="https://YOUR_DOMAIN"
   AUTH_TRUST_HOST="true"
   BETA_TESTER_EMAILS="<the 4 tester emails, comma-separated>"   # see step 6
   ```
   (First deploy: you can use the auto `*.vercel.app` URL, then set a custom
   domain and update `APP_URL` / `NEXTAUTH_URL` / the TrueLayer URLs, and
   redeploy.)
3. Deploy. The build runs `prisma migrate deploy` against Supabase automatically.
4. Go back to **TrueLayer** and make sure the redirect + webhook URLs use the
   final domain. Redeploy if you changed `TRUELAYER_REDIRECT_URI`.

---

## 6. Create the four beta testers + set the allowlist

Public sign‑up is **disabled** (closed beta), so provision the accounts directly.

1. Edit `scripts/create-beta-users.ts` — put your testers' **real emails** in
   `BETA_USERS` (real inboxes so they receive reminders/reports), and set/keep a
   password each.
2. Run it once against the **production** database (point `DATABASE_URL` at
   Supabase for this command):
   ```bash
   DATABASE_URL="<supabase session-pooler url>" npx tsx scripts/create-beta-users.ts
   ```
   It prints the exact `BETA_TESTER_EMAILS=...` line to paste into Vercel.
3. Set that **`BETA_TESTER_EMAILS`** value in Vercel (Production) — it must match
   the four emails exactly — and redeploy (or it picks up on next deploy).

The allowlist is enforced in three places: NextAuth `authorize()`, the login
action (a clear 403 message), and `middleware.ts` (a hard 403 for any
non‑allowlisted session). Only these four can sign in.

---

## 7. Hand it to testers

- Landing page `https://YOUR_DOMAIN/` → "coming soon" (no public login).
- Hidden login: **`https://YOUR_DOMAIN/beta-access`** → share this link + each
  tester's email/password.
- Each tester can connect their bank under **Transactions → Connect a bank** and
  change their password via **forgot‑password** or **Settings → Security**.

### Smoke test after deploy
- `/` shows the coming‑soon banner, no login/register buttons.
- `/beta-access` → sign in with a tester → lands on the dashboard.
- An email **not** on the allowlist → "403 — not part of the closed beta".
- (Live TrueLayer) connect a bank → redirected to TrueLayer → back to
  `/settings/banking?connected=…` with accounts + recent transactions.

---

## Quick gotcha checklist

- **TrueLayer live ≠ instant** — needs TrueLayer approval; run on Sandbox until then.
- **`TRUELAYER_REDIRECT_URI` must byte‑match** the console redirect URI (and the
  webhook path `/api/webhooks/bank-feed` is part of the signature — no proxy path
  rewrites).
- **`TOKEN_ENC_KEY` is mandatory** for a real feed (the app refuses to start without it).
- **Worker isn't on Vercel** — without it, polling/reminders don't run.
- **`EMAIL_FROM` must be on the Resend‑verified domain**, or sends bounce.
- **`BETA_TESTER_EMAILS` must equal the accounts you created**, or testers get a 403.
- The build fails fast if any required production var is missing (that's `check-env`).
