# PayRus Console

The operations console for PayRus: role-scoped dashboards, administration,
configuration and customer registration for staff, agents, merchants,
treasury and institutional users. It is the web counterpart of the consumer
**App** and runs on the **same Supabase backend**, so anything committed in
one is visible in the other.

Stack: Vite 7, React 19, TypeScript, Supabase (Postgres + Auth). No router —
navigation is a stage state machine in `src/App.tsx`.

## Quick start

```bash
pnpm install
cp .env.example .env    # then fill in the values below
pnpm dev                # http://localhost:5174
```

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server (port 5174, or `$PORT`) |
| `pnpm build` | Type-check (`tsc -b`) and production build to `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm lint` | ESLint |

### Environment

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (shared with the App) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key — public by design, not a secret |
| `VITE_CONVEX_SITE_URL` | The App's Convex site URL, used only for address autosuggest |

Never put a service-role key in this project. SSO and OAuth providers are
configured in the Supabase dashboard, not here.

## How it fits together

- **One backend.** Users, roles, wallets, transfers, audit and configuration
  live in Supabase Postgres (schema and RPCs in the App workspace's
  `supabase/migrations`). The console talks to it through `supabase-js`
  (`src/lib/*.ts`); privileged actions are security-definer RPCs.
- **One identity.** Supabase Auth sessions are shared with the App: password,
  magic link, phone OTP, OAuth and SSO. After sign-in the console resolves the
  user with `upsert_supabase_user`, then routes by role count — one role goes
  straight in, none or several go to the profile picker.
- **Roles and visibility are data, not code.** `role_definitions` maps each
  database role to a console role (and marks admin tiers). `console_role_tabs`
  decides which of the eight tabs each role sees. Both are editable by a super
  administrator from the App's *Roles & Access* panel and take effect on the
  next load.

## Screens

Landing, Welcome (sign-in), Register, Profile picker, KYC, Console (Overview,
Transactions, Payouts, Merchants, Agents, Mandates, Grants, Members), Send
money, Organisation, Register customer, Settings, Administration
(users, transactions, escalations, remittance corridors) and Configuration
(FX margins, live rates, recovery tools).

## Security

- **Two-factor authentication** (authenticator app / TOTP) is real: a user with
  a verified factor must pass a code at sign-in, again before sending money,
  and **Administration and Configuration require an enrolled factor and a
  verified session**. Enrol in Settings → Security; a factor enrolled here also
  protects the App.
- Sign-out ends the Supabase session, and the live session is re-checked on
  every load.
- Row-level security keeps private tables hidden from anonymous callers.

## Regression checks

Cross-app checks live in the App repository (`pnpm regression` there). They
verify that every table and RPC this console calls exists in the shared
backend, that anonymous callers cannot read private data, and that MFA, role
visibility and route parity have not regressed. Run them before merging
changes that touch either repository.

## Deploying

`pnpm build` produces a static site in `dist/`. For GitHub Pages set
`GITHUB_PAGES=1` so assets resolve under `/PayRus-Console/`.

## Related

- App (consumer web/mobile): https://github.com/infobitecconsulting-maker/payrus
- Requirements baseline: *PayRus Requirements Specification v2.0*.
