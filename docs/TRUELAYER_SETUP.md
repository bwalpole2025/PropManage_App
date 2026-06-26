# TrueLayer bank-feed integration

PropManage reads bank transactions over open banking via **TrueLayer's Data
API**. This document explains the backend that's been built, and exactly how to
configure it on TrueLayer's end.

The integration sits behind the existing `BankFeedService` interface, so the
app's UI, ingestion, polling and webhook code are unchanged. In dev/CI the
in-memory mock is always used; the real adapter only activates with an explicit
`BANK_FEED_PROVIDER=truelayer` in production.

---

## How it works (architecture)

There are **three** ways data moves, and "receiving API calls from TrueLayer" is
two of them:

1. **OAuth callback (TrueLayer → us, browser redirect).**
   The user authorises a bank on TrueLayer's hosted screen, then TrueLayer
   redirects their browser back to
   `GET /api/banking/truelayer/callback?code=…&state=…`. We verify the signed
   `state` (CSRF + which entity), exchange the `code` for an access + refresh
   token, store them **encrypted at rest**, and backfill ~90 days of history.

2. **Webhooks (TrueLayer → us, server-to-server POST).**
   TrueLayer POSTs a signed notification to
   `POST /api/webhooks/bank-feed`. We verify the `Tl-Signature` header against
   TrueLayer's public JWKS (ES512) — an unsigned or forged call is rejected with
   `401` and never reaches ingestion — then trigger an immediate sync.

3. **Polling (us → TrueLayer).**
   This is what actually keeps transactions current. The `pollBankFeed` job
   calls the Data API on a schedule and ingests new transactions idempotently.
   The short-lived access token is **refreshed automatically** (on a `401`)
   using the stored refresh token, for the life of the ~90-day consent.

> **Important:** TrueLayer's Data API does **not** push a webhook for every new
> transaction. Continuous monitoring is driven by **polling**; the webhook is a
> low-latency *nudge* (and a consent-revoked signal) that triggers an immediate
> poll. Both are wired up — keep the poll job running.

### Files

| Path | Responsibility |
| --- | --- |
| `lib/banking/truelayer.ts` | Data API client: auth URL, token exchange/refresh, accounts, transactions, revoke, DTO + money mapping |
| `lib/banking/webhook-signature.ts` | Verifies TrueLayer's `Tl-Signature` (ES512 JWS) against their JWKS |
| `lib/banking/state.ts` | Signs/verifies the OAuth `state` (HMAC over entity + nonce) |
| `lib/banking/link.ts` | Shared "persist connection + backfill" core |
| `lib/services/real/bankFeed.ts` | `TrueLayerBankFeedService` implementing `BankFeedService` |
| `app/api/banking/truelayer/callback/route.ts` | OAuth redirect handler |
| `app/api/webhooks/bank-feed/route.ts` | Signed webhook receiver |

---

## 1. Create a TrueLayer application

1. Sign up at <https://console.truelayer.com> and create an application.
2. You get a **`client_id`** and **`client_secret`**. There are separate
   credentials for **Sandbox** and **Live** — start with Sandbox.
3. Note the hosts the backend uses (selected by `TRUELAYER_ENV`):
   - Sandbox auth `https://auth.truelayer-sandbox.com`, data `https://api.truelayer-sandbox.com`
   - Live auth `https://auth.truelayer.com`, data `https://api.truelayer.com`

## 2. Register the redirect URI

In the console under **Redirect URIs**, add the **exact** callback URL — it must
byte-match `TRUELAYER_REDIRECT_URI`:

```
https://YOUR_DOMAIN/api/banking/truelayer/callback
```

For local sandbox testing add `http://localhost:3000/api/banking/truelayer/callback`.

## 3. Enable the Data API scopes / providers

Make sure your app has the Data API product enabled with scopes:
`info accounts balance transactions offline_access`
(`offline_access` is what gets you a **refresh token** — without it the feed dies
after ~1 hour.)

`TRUELAYER_PROVIDERS` controls which banks appear at consent. Sandbox ships a
mock bank (`uk-cs-mock`) so you can test end-to-end without real credentials.

## 4. Register the webhook

In the console under **Webhooks**, set the destination URL to:

```
https://YOUR_DOMAIN/api/webhooks/bank-feed
```

TrueLayer signs each webhook with `Tl-Signature`; our endpoint verifies it
against TrueLayer's published JWKS
(`https://webhooks.truelayer.com/.well-known/jwks`, overridable via
`TRUELAYER_WEBHOOK_JWKS_URL`). No shared secret to copy — verification is by
public key.

> The webhook path is part of the signed bytes, so the URL you register **must**
> match the path the request hits (`/api/webhooks/bank-feed`). If you put the app
> behind a proxy that rewrites the path, verification will fail.

## 5. Configure the app's environment

```bash
BANK_FEED_PROVIDER="truelayer"          # opt in to the real feed
NODE_ENV="production"                    # dev/CI force the mock regardless
TOKEN_ENC_KEY="<32+ char random secret>" # REQUIRED — encrypts tokens at rest
AUTH_SECRET="<random>"                    # also signs the OAuth state

TRUELAYER_CLIENT_ID="..."
TRUELAYER_CLIENT_SECRET="..."
TRUELAYER_ENV="sandbox"                  # sandbox | live
TRUELAYER_REDIRECT_URI="https://YOUR_DOMAIN/api/banking/truelayer/callback"
TRUELAYER_PROVIDERS="uk-cs-mock uk-ob-all uk-oauth-all"   # drop uk-cs-mock for live
TRUELAYER_WEBHOOK_JWKS_URL="https://webhooks.truelayer.com/.well-known/jwks"
```

`TOKEN_ENC_KEY` is enforced: the app refuses to start a real provider without it
(see `lib/crypto.ts`).

## 6. Test it (sandbox)

1. Run the app with the env above (`TRUELAYER_ENV=sandbox`).
2. In the app go to **Transactions → Connect a bank**; you're redirected to
   TrueLayer's hosted screen. Pick the **mock bank** and use TrueLayer's sandbox
   test credentials (`john`/`doe` style — see their console).
3. You're redirected back to `/settings/banking?connected=…`; the connection and
   accounts appear and recent transactions are imported.
4. Keep `pollBankFeed` running (the worker) to pull new transactions.
5. To exercise the webhook, send a test event from the TrueLayer console — a
   genuine signed call returns `200`; a hand-rolled `curl` (no valid signature)
   correctly returns `401`.

## 7. Going live

- Swap to **Live** credentials and `TRUELAYER_ENV=live`; remove `uk-cs-mock`
  from `TRUELAYER_PROVIDERS`.
- TrueLayer is the regulated AISP; live access requires completing their
  go-live / app-approval process. Budget time for this.
- Make sure `TOKEN_ENC_KEY` is a managed secret (ideally backed by a KMS) and
  rotated — `lib/crypto.ts` notes this is a demo-grade wrapper today.
- Consent lasts ~90 days. When it lapses the connection is marked `EXPIRED`;
  the user re-consents from **Settings → Banking** (the "reconnect" action).

---

## Can I use MCP servers for this?

**No — not for receiving TrueLayer's calls.** MCP (Model Context Protocol) is a
way to expose tools/data to an **AI assistant**; it is a client↔server protocol
for LLM agents, not a public HTTPS endpoint that a third party like TrueLayer can
call. TrueLayer needs to (a) redirect a browser to a registered HTTPS URL and
(b) POST signed webhooks to an HTTPS URL — both are ordinary web endpoints, which
is exactly what the routes above provide. An MCP server can't register as a
TrueLayer redirect/webhook target, can't terminate TLS for arbitrary inbound
HTTP, and has no signature-verification contract with TrueLayer.

Where MCP **could** help, as a separate layer on top of this backend: letting an
AI assistant *query* the data you've already ingested — e.g. an MCP tool
`get_recent_transactions(entityId)` or `summarise_rent_received(month)` that
reads from your database. That's an outbound convenience for an agent, not the
integration with TrueLayer. The bank feed itself must be the standard
OAuth + webhook + polling backend.
