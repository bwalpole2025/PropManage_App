# PropManage

A UK landlord finance & property-management SaaS (Hammock-style). It helps individual
and portfolio landlords replace spreadsheets: track rental income & expenses, monitor
rent arrears, store compliance documents with expiry reminders, estimate tax against the
SA105 property pages, and stay ready for Making Tax Digital (MTD) for Income Tax.

> **Not tax advice.** Tax figures in the app are automated estimates to help you plan.

## Stack

- **Next.js 15** (App Router, React Server Components + server actions) + **TypeScript**
- **Tailwind CSS** with a small shadcn/ui-style primitive kit
- **Prisma** ORM on **SQLite** (local dev) — swap `provider` for Postgres in production
- **Auth.js (NextAuth v5)** — email/password credentials, JWT sessions
- Deferred bank-feed and HMRC integrations behind clean **service interfaces** with
  mock implementations (`lib/services`)

## Getting started

```bash
npm install
npm run db:migrate        # create the SQLite schema
npm run db:seed           # load demo data (prints login credentials)
npm run dev               # http://localhost:3000
```

### Demo logins (from the seed)

| Role | Email | Password |
| --- | --- | --- |
| Landlord (owns 2 entities) | `landlord@example.com` | `Password123!` |
| Accountant (delegated to entity A) | `accountant@example.com` | `Password123!` |

Sign in as the landlord to see a fully populated dashboard, or as the accountant to see
**delegated access** scoped to a single client — use the org switcher (top of the sidebar)
to move between accounts.

## Architecture notes

- **Tenant boundary is `LandlordEntity`**, not `User`. Every financial row carries
  `landlordEntityId`; queries are scoped via `lib/auth/active-org.ts`. A `Membership`
  (user ↔ entity + role) powers accountant delegated access — one login can serve many
  client entities. `Owner`/`OwnershipShare` capture beneficial/tax splits separately.
- **RBAC** is a code policy in `lib/auth/rbac.ts` (`OWNER`/`MANAGER`/`ACCOUNTANT`/
  `ASSISTANT`/`VIEWER`). `requireEntityAccess(entityId, capability)` guards mutations;
  pages soft-gate with `can(...)`.
- **SA105 mapping** lives in `lib/sa105.ts`; the tax engine in `lib/tax.ts` encodes the
  individual finance-cost restriction (20% reduction), the limited-company deduction, and
  the £1,000 property allowance.
- **Deferred integrations**: `BankFeedService`, `HmrcMtdService`, `TaxEstimationService`
  in `lib/services/types.ts`, selected by an env factory (`lib/services/index.ts`). Set
  `SERVICE_MODE=mock` (default outside production). Real providers (TrueLayer, HMRC MTD)
  drop in behind the same interfaces.

## Project layout

```
app/            (auth) + (app) route groups, api/auth handler, onboarding, accept-invite
components/     ui/ (primitives), shared/, layout/, properties/, transactions/, tax/, settings/
lib/            auth/ (Auth.js, active-org, rbac), services/, db, enums, sa105, tax, format
services/       org-scoped read queries (RSC)
actions/        'use server' mutations (auth, property, transaction, team, org, entity)
prisma/         schema.prisma, seed.ts, migrations
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` / `db:seed` / `db:reset` | Prisma migrate / seed / reset |
