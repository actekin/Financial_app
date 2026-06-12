# FinFlow — Personal Finance Dashboard

A local-first, browser-based personal finance app that ingests bank statements (CSV), auto-categorizes transactions, and visualizes money flows as an interactive Sankey diagram.

See `PLAN.md` for full architecture and design. See `SPEC.md` for product requirements.

## Developer Quickstart

**Prerequisites:** Node.js 20+, pnpm

```bash
cd app
pnpm install
pnpm dev          # http://localhost:3000
```

**Other commands:**

```bash
pnpm build        # Production build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript check
pnpm test         # Vitest unit tests
```

## Shared Household Access

By default the app runs unprotected for single-user local use. To share it with a partner:

1. **Host one instance somewhere you can both reach** — a home server / Raspberry Pi, a machine on a [Tailscale](https://tailscale.com) tailnet, or a small VPS. All data lives in one SQLite file (`app/data/financial.db`) on that machine, so you both see the same picture. Run a single instance only (the sql.js database is held in process memory and persisted to disk).
2. **Set a shared password** before starting the server:

   ```bash
   FINFLOW_PASSWORD="your-household-password" pnpm start
   ```

   Every page and API route then requires sign-in. Each of you signs in with your own name + the shared password; sessions last 90 days per browser. Uploads and balance updates are attributed to whoever made them.
3. Optionally set `FINFLOW_SECRET` to a long random string to sign session cookies independently of the password (otherwise the password itself is used as the signing key, and changing it signs everyone out).

If you expose the app beyond your LAN/tailnet, put it behind HTTPS (e.g., a reverse proxy with TLS) — the password otherwise travels in plain text.

## Keeping Data Fresh

- **Quick Update page** (`/quick-update`) — shows every account's data freshness (last balance, last transaction, who updated it, staleness badge) and lets you check in current balances for all accounts in one save.
- **Multi-file upload** (`/upload`) — drop all your latest statement CSVs at once and assign each to an account. Re-uploading overlapping statements is safe; duplicates are skipped automatically.
- The dashboard warns when any account has no data from the last 7 days.

## For AI Agents

If you are an AI coding agent, read these files in order:

1. `AGENTS.md` — contribution rules and coordination method
2. `TASKS.md` — task queue (pick an unassigned task)
3. `SPEC.md` — product specification and acceptance criteria
4. `API.md` — REST API reference
5. `PLAN.md` — architecture, data model, and design decisions
