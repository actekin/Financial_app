# FinFlow Demo Guide

This guide gets you from a fresh clone to a populated demo dashboard in about ten minutes, then explains what to export from your real accounts to build a full picture of your family finances.

## Part 1 — Spin up a demo environment

### Prerequisites

- Node.js 20+
- pnpm (`corepack enable` or `npm i -g pnpm`)

### 1. Run the app

```bash
cd app
pnpm install
pnpm dev          # http://localhost:3000
```

That's it — no env file is required for a demo. With no configuration:

| Variable | If unset (demo default) | If set |
|---|---|---|
| `APP_PASSWORD` | Login is **disabled** — the app opens directly | Shared-password login for the household |
| `HOUSEHOLD_MEMBERS` | — | Comma-separated names shown on the login screen |
| `ANTHROPIC_API_KEY` | Advisor answers return a friendly "not configured" message; every chart still works | AI Advisor answers questions from your live data |
| `ADVISOR_MODEL` | `claude-opus-4-8` | Override the advisor model |

To enable any of these, `cp .env.example .env.local` inside `app/` and fill in values, then restart `pnpm dev`.

**Docker alternative:** `docker compose up` from the repo root works too, but note it *requires* `APP_PASSWORD` — create a `.env` at the repo root (`cp app/.env.example .env`) and set it, or compose will refuse to start. Data persists in the `finflow-data` volume.

### 2. Create demo accounts

The database starts empty (it's created automatically at `app/data/financial.db` on first use). Go to **Accounts → Add Account** and create these three, matching the bundled sample data in [`demo-data/`](demo-data/):

| Account name | Bank | Type | Currency |
|---|---|---|---|
| Chase Checking | Chase | Checking / Current | USD |
| Chase Freedom Card | Chase | Credit Card | USD |
| Lloyds Current | Lloyds | Checking / Current | GBP |

### 3. Set opening balance snapshots

This step matters: account balances are always *derived* from the latest snapshot plus transaction flows. Without a snapshot, an account's starting balance is treated as 0 and the dashboard's cash position and Sankey "reserves" nodes will look wrong.

For each account, click **Set Balance** and save:

| Account | Snapshot date | Balance |
|---|---|---|
| Chase Checking | 2026-05-31 | 12,500.00 |
| Chase Freedom Card | 2026-05-31 | -850.00 |
| Lloyds Current | 2026-05-31 | 6,300.00 |

(The sample transactions start June 1, so snapshots dated May 31 give correct opening balances.)

### 4. Upload the sample statements

Go to **Upload**, and for each file: select the matching account, drop the CSV in, check the preview, and click **Import**:

| File | Account |
|---|---|
| `demo-data/demo-checking.csv` | Chase Checking |
| `demo-data/demo-credit-card.csv` | Chase Freedom Card |
| `demo-data/demo-lloyds.csv` | Lloyds Current |

Transactions are auto-categorized by merchant rules (salary, rent, groceries, subscriptions, travel…) and duplicates are fingerprinted, so re-uploading the same file is harmless — rows are skipped, not doubled.

### 5. Tour the app

- **Dashboard** — cash position, this month vs trailing average, monthly trend, and the Sankey flow diagram. Click any Sankey link to drill into its transactions.
- **Transactions** — full list; recategorize anything inline.
- **Goals** — add a savings goal (e.g. 🏖 "Holiday fund", $3,000 by December) or link one to an account to track its balance automatically.
- **Advisor** — with `ANTHROPIC_API_KEY` set, ask something like *"Can we afford a $600 weekend trip this month?"* and get a verdict grounded in the demo numbers.

### Resetting the demo

Stop the dev server and delete `app/data/financial.db` — the schema is recreated empty on next launch.

---

## Part 2 — Getting the full picture of your family finances

FinFlow ingests **CSV statement exports only** — files are parsed in your browser and never uploaded anywhere; only the parsed transactions reach the local database. So "documentation to upload" means CSV exports from each institution, plus a balance snapshot per account. Here's the checklist.

### 1. One account in FinFlow per real-world account

Create an account entry (bank, type, currency) for every account money flows through:

- **Checking/current accounts** — each bank, each person
- **Savings accounts**
- **Credit cards** — each card
- **Investment accounts** — e.g. Trading 212

Supported bank formats with dedicated handling: Bank of America, Chase, Lloyds, HSBC, Amex, QNB Finansbank, Revolut, Trading 212. Anything else: choose **Other** and export a CSV with `Date`, `Description`, `Amount` columns (or `Money In` / `Money Out`).

### 2. Export a CSV from each institution

From each bank's website/app, export transaction history as CSV. Tips per format:

- **US banks (BoA, Chase)** — dates as MM/DD/YYYY, a single signed `Amount` column (negative = money out).
- **UK banks (Lloyds, HSBC, Amex UK, Revolut)** — dates as DD/MM/YYYY; split `Money In` / `Money Out` columns also work.
- **QNB Finansbank** — Turkish headers (`Tarih`, `Açıklama`, `Tutar`) and number format (1.234,56) are understood.
- **Revolut** — include the `Currency` column; per-row currencies are respected.
- **Trading 212** — use the standard export; deposits/withdrawals/dividends count as cash flow, market buys/sells are automatically excluded so they don't look like spending.

**How much history?** Upload at least 3 full months so the "vs trailing average" comparisons and monthly trend are meaningful; 6–12 months is better. Deduplication means overlapping exports are safe.

**Ongoing:** re-export and upload monthly (or whenever) — only new transactions are imported.

### 3. Enter a balance snapshot per account

For each account, enter one **balance snapshot** dated just before your earliest uploaded transaction (e.g. statement opening balance). This anchors all derived balances. Re-snapshot occasionally (e.g. quarterly) to correct drift from anything that didn't come through a statement.

### 4. Know what's *not* covered (yet)

FinFlow tracks **cash flow**, not net worth. There is currently no ingestion for:

- **PDF statements, scans, or photos** — CSV only; no OCR. If a bank only offers PDF, convert it to CSV first (many banks offer both — look under "export" or "download activity").
- **OFX/QFX/QIF files** — planned, not implemented.
- **Mortgages, loans, property values, pensions, insurance policies** — no asset/liability model. Partial workaround: represent a loan as an account and snapshot its (negative) balance so payments show up in the flow.
- **Per-person ownership** — accounts belong to the household, not individuals; use account names/groups (e.g. "Alex — Chase Checking") to keep things distinguishable.
- **Cross-currency totals** — multi-currency accounts work, but dashboard sums do not FX-convert; keep an eye on mixed-currency charts.

### Quick checklist

- [ ] Account created in FinFlow for every checking, savings, credit card, and investment account
- [ ] CSV export uploaded for each, covering 3+ months
- [ ] Opening balance snapshot entered per account
- [ ] Recurring monthly re-export habit (dedup makes this painless)
- [ ] Savings goals entered, linked to accounts where possible
- [ ] `APP_PASSWORD` + `HOUSEHOLD_MEMBERS` set once real data is in
