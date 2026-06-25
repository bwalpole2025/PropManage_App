# PropManage

A UK landlord finance & property-management SaaS (Hammock-style). It helps individual
and portfolio landlords replace spreadsheets: track rental income & expenses, monitor
rent arrears, store compliance documents with expiry reminders, estimate tax against the
SA105 property pages, and stay ready for Making Tax Digital (MTD) for Income Tax.

> **Not tax advice.** Tax figures in the app are automated estimates to help you plan.

## Stack

- **Next.js 15** (App Router, RSC + server actions) + **TypeScript**, **Tailwind CSS**
- **tRPC** typed API layer + **TanStack Query** (client server-state) + **React Hook
  Form** + **Zod** (forms share schemas with the API)
- **Prisma** ORM on **PostgreSQL** — money as integer pence + ISO `currency` code
- **Auth.js (NextAuth v5)** — email/password credentials + email verification, password
  reset, and optional **TOTP 2FA**
- **BullMQ** background jobs (reminders / arrears / feed-polling) — **in-memory by
  default**, Redis only when `QUEUE_DRIVER=bullmq`
- **S3-compatible `DocumentStorage`** — local filesystem by default, S3/MinIO behind
  `STORAGE_DRIVER=s3`
- Deferred integrations behind clean provider interfaces (`BankFeedProvider`,
  `HmrcMtdProvider`, `DocumentStorage`, `EmailSender`), each with a mock for local dev
- **CI** (GitHub Actions): lint + typecheck + Vitest units + Playwright smoke, against a
  Postgres service container

Everything external (queue, storage, email, bank feed, HMRC) defaults to a mock, so the
app boots locally with **only PostgreSQL** — no Docker/Redis/S3 required.

## Getting started

```bash
# 1. PostgreSQL (local). Create the database (adjust host/port to your install):
createdb propmanage           # or: createdb -h localhost -p 5433 propmanage

# 2. Configure: copy .env.example to .env and set DATABASE_URL to your Postgres.
cp .env.example .env

# 3. Install, migrate, seed, run:
npm install
npm run db:migrate            # apply migrations to Postgres
npm run db:seed               # load demo data (prints login credentials)
npm run dev                   # http://localhost:3000

# Optional: run the background worker (in-memory queue, no Redis)
npm run worker
```

### Demo logins (from the seed)

| Role | Email | Password |
| --- | --- | --- |
| Landlord (owns 2 entities) | `landlord@example.com` | `Password123!` |
| Accountant (delegated to entity A) | `accountant@example.com` | `Password123!` |

Sign in as the landlord to see a populated dashboard, or as the accountant to see
**delegated access** scoped to one client — use the org switcher (top of the sidebar).

## Architecture notes

- **Multi-tenant by account.** `LandlordEntity` is the tenant boundary (`= account_id`);
  every financial row carries `landlordEntityId` and queries scope by it. A Prisma client
  extension (`lib/db.ts`) default-excludes soft-deleted rows (`archivedAt` on Property /
  Tenancy) and asserts tenant-scoping; `Membership` (user ↔ entity + role) powers
  delegated access. `Owner`/`OwnershipShare` capture beneficial/tax splits.
- **RBAC** is a code policy (`lib/auth/rbac.ts`): OWNER / MANAGER / ACCOUNTANT / ASSISTANT
  / VIEWER. `requireEntityAccess(entityId, capability)` guards mutations; pages soft-gate
  with `can(...)`; tRPC uses `accountProcedure` / `requireCapability(...)`.
- **Typed API.** `lib/trpc/*` exposes routers that wrap the existing `services/*` reads
  and `actions/*` mutation cores; the tRPC context reuses the Auth.js session + active
  entity. The dashboard KPI widget and the add-property form are wired end-to-end through
  tRPC + TanStack Query + RHF/Zod; other screens still use RSC + server actions (they
  coexist).
- **Tax**: SA105 mapping in `lib/sa105.ts`; the engine in `lib/tax.ts` encodes the
  individual finance-cost 20% restriction, the company deduction, and the £1,000 property
  allowance (covered by `tests/tax.test.ts`).
- **Service factories** select mock vs real via env: `SERVICE_MODE`, `BANK_FEED_PROVIDER`,
  `HMRC_MTD_MODE`, `STORAGE_DRIVER`, `QUEUE_DRIVER`, `EMAIL_DRIVER`. See `.env.example`.

## Project layout

```
app/            (auth) + (app) route groups; api/{auth,trpc,files}; verify-email; onboarding
components/     ui/ shared/ layout/ properties/ transactions/ tax/ settings/
lib/            auth/ (Auth.js, active-org, rbac, tokens)  trpc/  services/ (+ mock, real)
                jobs/ (queue + handlers)  email/  db  enums  sa105  tax  format
schemas/        shared Zod schemas (tRPC .input() + RHF resolver)
services/       org-scoped read queries          actions/   'use server' mutations
prisma/         schema.prisma, seed.ts, migrations          worker.ts   background worker
tests/          Vitest unit tests                e2e/       Playwright smoke
.github/workflows/ci.yml                         eslint.config.mjs  vitest.config.mts  playwright.config.ts
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run worker` | Background job worker |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run e2e` | Playwright smoke (builds first in CI) |
| `npm run db:migrate` / `db:seed` / `db:reset` | Prisma migrate / seed / reset |
