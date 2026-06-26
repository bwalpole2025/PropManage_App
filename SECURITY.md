# Security & privacy review checklist

A standing checklist for PropManage, mapping each control to where it lives in
the codebase. Re-verify on any change that touches auth, data access, money, or
external integrations.

## Tenant isolation

- [x] **Account is the tenant boundary.** Every financial/personal row carries
  `accountId`; queries scope by it. (`prisma/schema.prisma`)
- [x] **Defence-in-depth Prisma guard** warns (or, with `STRICT_TENANT_SCOPE=1`,
  throws) when a bulk read on a directly-scoped model omits a scoping clause.
  (`lib/db.ts`)
- [x] **The real authority is `requireEntityAccess(entityId, capability)`** in
  every server action / route handler before a mutation. (`lib/auth/active-org.ts`)
- [x] Cross-account access is impossible via the active-entity cookie: membership
  is re-checked server-side against `Membership` each request.

## Role-based access control (owner / manager / accountant / assistant / viewer)

- [x] **Capability policy kept in code** (auditable), not the DB.
  (`lib/auth/rbac.ts`)
- [x] Mutations gate with `requireEntityAccess(...)`; pages soft-gate with
  `can(...)`; tRPC uses `accountProcedure` / capability checks.
- [x] Audit trail is read-restricted to owner/manager/accountant
  (`canViewAuditLog`).

## Encryption & secrets

- [x] **Provider tokens encrypted at rest** with AES-256-GCM. (`lib/crypto.ts`)
- [x] **Fails closed**: a real bank provider in production without `TOKEN_ENC_KEY`
  throws rather than using the dev key.
- [x] **No raw credentials stored.** Bank feeds use open-banking consent
  (opaque access/refresh tokens only); HMRC MTD stores only encrypted OAuth
  tokens + `oauthState` on `MtdConnection` — never Government Gateway passwords.
- [x] Card data never touches our servers — billing uses a provider-hosted
  checkout (`PaymentService`).
- [x] Passwords hashed with bcrypt; optional TOTP 2FA. Data export **omits**
  encrypted tokens and password hashes (`services/data-export.ts`).

## Provider token flows (banking & HMRC)

- [x] Bank: `startBankLink` → `completeBankLink` (consent → opaque token +
  90-day expiry), re-consent + revoke paths. (`actions/bank.ts`)
- [x] HMRC MTD: authorize-URL → code-exchange with encrypted token persistence
  behind the `HmrcMtdService` interface; raw tokens never cross the boundary.
  (`lib/services/types.ts`, `lib/services/mock/hmrcMtd.ts`)

## Audit logging (financial changes & external submissions)

- [x] **Append-only `AuditLog`** with a best-effort writer that can never break
  the audited action. (`lib/audit.ts`)
- [x] Financial mutations audited: transaction create/edit/categorise/exclude/
  restore/bulk/import. (`actions/transaction.ts`, `actions/bank.ts`)
- [x] External submissions audited: bank connect/reconnect/disconnect; HMRC
  submission hooks ready (`AuditAction.MTD_SUBMIT_*`).
- [x] Viewable activity log. (`app/(app)/settings/activity`)

## GDPR / data-subject rights

- [x] **Access & portability**: complete JSON export (owner-only, audited).
  (`/api/account/export`, `services/data-export.ts`)
- [x] **Erasure**: permanent, name-confirmed account deletion that cascades all
  data. (`actions/privacy.ts`)
- [x] **Consent**: marketing opt-in separate from operational alerts; privacy &
  cookie policies published. (`app/(legal)/*`)

## Cookies & privacy-first

- [x] Only strictly-necessary cookies set by default; optional cookies wait for
  explicit consent. (`lib/consent.ts`, `components/shared/cookie-consent.tsx`)
- [x] Consent re-manageable from Settings → Privacy.

## Transport, sessions & input

- [x] Auth.js session cookies are httpOnly + SameSite; consent cookie is SameSite=Lax, non-secret.
- [x] Server actions validate input with Zod schemas shared with the client.
- [x] Webhooks (bank feed) verified via the provider interface before ingest.

## CI / supply chain

- [x] CI runs lint, typecheck, unit + integration tests, build, and the E2E happy
  path against a Postgres service with migrations + seed. (`.github/workflows/ci.yml`)
- [x] Preview deploys are secret-gated and never expose secrets in logs.
  (`.github/workflows/preview.yml`)
