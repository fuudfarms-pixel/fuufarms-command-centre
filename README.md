# Fuud Farms — Command Centre

Internal finance tool for Fuud Farms Limited: capital, stock, orders and assets, in naira.

Next.js 16 (App Router) · React 19 · TypeScript · Neon Postgres + Drizzle · Neon Auth.

```bash
npm install
cp .env.example .env.local   # then fill it in — see Configuration
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | the usual |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit tests for the accounting and the role model |
| `npm run verify:fulfilment` | integration check of the order→stock→income path against a real database |
| `npm run db:generate` / `db:migrate` | Drizzle migrations |
| `npm run seed:admin -- <email> "<name>"` | bootstrap the first super admin |

## Where this came from

It replaces `FuudFarms_Tracker.jsx`, a single-file React dashboard that could not be used
for real:

- **It could not persist.** Storage went through `window.storage` — the Claude Artifacts
  sandbox API — wrapped in `try {} catch {}` that swallowed every error. Outside that
  sandbox it looked like it worked and lost everything on refresh.
- **It had no users.** No auth, no record of who entered what.
- **The accounting was wrong**, in a way that flattered the business. See below.

## The accounting

The old model was:

```js
netWorth = capital + assets + inventory + profit   // wrong
```

`capital` was a number you typed in and it never moved when you spent it, so cash used to
buy a vehicle was counted twice — once as untouched capital, once as an asset. There was no
cash balance at all.

The model now:

```
cash     = Σ capital events + Σ income − Σ expenses
netWorth = cash + assets + stock at cost
```

Buying stock moves value from `cash` into `stock`, so a purchase leaves net worth
**unchanged** — that is what makes it a balance sheet rather than a running total of
everything that ever happened. It is asserted in `lib/metrics.test.ts` and end-to-end.

Two deliberate choices worth knowing:

- **Stock is held at cost, never at market.** The market uplift shows as *unrealised gain*
  but stays out of net worth: it is not yours until you sell.
- **Purchases are expensed when bought, not when sold.** This is cash-basis, and it is how
  most small traders keep books — but it means net profit reads negative while you are
  holding stock you have paid for and not yet sold. Net worth stays correct throughout. If
  you want profit to track sales instead, that is a move to cost-of-goods-sold, and it is a
  real change, not a tweak.

Stock levels are **derived** from `inventory_movements`, never stored in a mutable column,
so the number can always be explained and concurrent writes cannot lose each other.

Money is stored as **integer kobo in `bigint`**. The old file did naira arithmetic in JS
floats.

## Configuration

Copy `.env.example` to `.env.local`. Nothing is read at module scope, so `npm run build`
works with no secrets at all — useful in CI, and it makes a missing variable a clear runtime
error rather than an opaque build failure.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string. Use the `dev` branch locally. |
| `NEON_AUTH_BASE_URL` | From Neon Console → Auth. Each database branch has its own. |
| `NEON_AUTH_COOKIE_SECRET` | `openssl rand -base64 32` |
| `APP_ORIGIN` | Origin the app is served from; Neon Auth requires it on sign-up. |
| `INVITE_TOKEN` | Leave empty to keep self-registration closed. |

## Security

**Close self-registration in the Neon Console.** `disableSignUp` defaults to `false`, and
the auth endpoint is reachable directly — a `POST` to `/sign-up/email` with an `Origin`
header creates a working account without ever touching this app. The `INVITE_TOKEN` gate
here does **not** protect that path, because the request never reaches our code.

Before this is exposed to the internet, in Neon Console → Auth:

- `disableSignUp` → **true**
- Google OAuth → **off**. It is on by default with shared credentials, and every current
  `better-auth` advisory is in an OAuth path.
- Organization plugin → **off** (unused, and carries its own advisory)
- `allow_localhost` → **off**
- `trusted_origins` → your real domain

Known dependency issue: `@neondatabase/auth@0.4.2-beta` pins `better-auth@1.4.18`, and the
advisories need `≥1.6.22`. There is no newer SDK. All of them are in OAuth / OIDC /
magic-link / email-OTP paths, none of which this app uses, and the server side runs on
Neon's infrastructure. Revisit when Neon ships a patched SDK.

Authorisation is enforced **at the point of use**, not by middleware: every page calls
`requireUser()` and every server action calls `requireRole()` (`lib/auth/guard.ts`). A server
action can be POSTed directly regardless of routing, so that is the only layer that counts.
`proxy.ts` only redirects unauthenticated navigation, and deliberately skips non-GET
requests — Neon Auth's middleware does not recognise a session on POST, which otherwise
bounces every form submission to the login page.

Roles: `superadmin` (everything, plus user management) → `admin` (full ledger, can delete)
→ `staff` (read and record, cannot delete).

## Deploying

**Firebase App Hosting**, project `fuudfarms-command-centre-c5b53`. It builds with Cloud
Build and serves on Cloud Run, but everything is managed through Firebase and deploys happen
on push to `main`. Config lives in `apphosting.yaml`.

One-time setup:

```bash
firebase apphosting:backends:create --project fuudfarms-command-centre-c5b53
#   ... connects the GitHub repo and picks a region (browser step)

firebase apphosting:secrets:set DATABASE_URL             # the PROD Neon string
firebase apphosting:secrets:set NEON_AUTH_COOKIE_SECRET  # openssl rand -base64 32
```

Then, after the first rollout produces a URL:

1. Put that URL in `apphosting.yaml` as `APP_ORIGIN` and push.
2. Add the same URL to **trusted origins** in the Neon Console, and turn off
   `allow_localhost`. Sign-in fails with `MISSING_ORIGIN` otherwise.

`output: 'standalone'` in `next.config.ts` is **required** — App Hosting runs the
self-contained `server.js` it emits. Without it the build succeeds and the app fails to boot
with errors that do not point at the cause. Note `next start` does *not* work with standalone
either; locally, run `node .next/standalone/server.js`.

Do not set `NODE_ENV` in `apphosting.yaml`; it breaks the Next.js buildpack.

`deploy/Dockerfile` is not used by App Hosting. It is kept as an escape hatch for deploying
to plain Cloud Run, and it is verified working.

## Layout

```
app/(dash)/       dashboard, transactions, inventory, orders, assets, capital, admin/users
app/auth/         sign-in, invite-gated sign-up, server actions
lib/metrics.ts    all derived numbers, pure and unit-tested
lib/fulfil.ts     order → stock → income, in one database transaction
lib/auth/         Neon Auth client, role model, requireUser/requireRole
db/schema.ts      Drizzle schema (business tables only; neon_auth is Neon's)
```

Server action modules may only export async functions. Constants live in `lib/domain.ts` and
types beside them — an exported array in a `'use server'` file becomes a server-action
reference and arrives at the client as a function, which fails at render, not at build.
