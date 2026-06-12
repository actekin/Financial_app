# Product Specification — FinFlow

## Goal

FinFlow is a local-first, browser-based personal finance dashboard that ingests bank statements (CSV) from multiple accounts across multiple currencies, auto-categorizes transactions, and visualizes all money flows as an interactive Sankey diagram. The app prioritizes privacy (all data stays on the user's machine) and clarity (one chart tells the full financial story).

## Non-Goals

- **Not a budgeting app.** No budget-setting or alerting in the MVP. (Planned for Phase 2.)
- **Not a bank connector.** No Plaid/Open Banking integration in the MVP. (Planned for Phase 3.)
- **Not fully multi-user.** No per-user accounts or roles. The app supports a *shared household* model: an optional shared password (`FINFLOW_PASSWORD`) protects the app, each household member signs in with their own name, and uploads/balance updates are attributed to that name.
- **Not cloud-hosted.** No remote database or cloud sync. The household can self-host the single instance (home server, Raspberry Pi, Tailscale) so multiple people reach the same local SQLite data.
- **Not mobile-first.** Desktop viewport (≥1024px) is the target. Mobile is Phase 3.
- **No PDF parsing.** CSV-only for the MVP. PDF support is Phase 1.
- **No LLM categorization.** Rule-based engine only for the MVP. LLM upgrade is Phase 2.

## Core User Flows

1. **Sign in (optional)** — When `FINFLOW_PASSWORD` is set, each household member signs in with their name + the shared password. Their name is recorded on every upload and balance update.
2. **Account setup** — User creates accounts (bank, name, currency, type) via the Accounts page.
3. **CSV upload** — User uploads bank statement CSV files via the Upload page (multiple files at once, each assignable to an account). The app auto-detects the bank format, parses transactions, deduplicates against existing data, and auto-categorizes.
4. **Balance snapshot** — User enters starting account balances (or the app infers them from statement data) so the Sankey can show starting/ending reserves.
5. **Quick Update** — User opens the Quick Update page to see every account's data freshness (last snapshot, last transaction, who updated it) and checks in current balances for all accounts in one save. The dashboard warns when accounts have no data from the last 7 days.
6. **Sankey exploration** — User views the main dashboard showing a Sankey diagram: starting reserves → inflows/outflows by category → ending reserves. Hovering shows tooltips; clicking a strand opens a transaction detail panel.
7. **Transaction relabeling** — User can recategorize individual transactions or rename entire strands to correct auto-categorization errors.
8. **Date range filtering** — User adjusts the date range to see flows for a specific period.
9. **TODO:** Currency switching — User switches display currency; all amounts re-convert using historical rates.
10. **TODO:** Supplementary charts — Category breakdown donut, monthly trend line, reserves bar chart.

## Acceptance Criteria

- [x] User can create, list, and delete bank accounts
- [x] User can upload CSV files and see parsed transactions imported
- [x] Duplicate transactions (same date, amount, description, account) are skipped on re-import
- [x] Transactions are auto-categorized by a regex rule engine on import
- [x] The dashboard renders a Sankey diagram from transaction data
- [x] Sankey API computes nodes and links grouped by category and direction
- [x] Optional shared-password login protects all pages and API routes; each member signs in with their name
- [x] Uploads and balance snapshots record who made them
- [x] Quick Update page shows per-account data freshness and saves balances for many accounts in one action
- [x] Upload page accepts multiple CSV files in one batch
- [x] Dashboard warns when accounts have no data from the last 7 days
- [ ] TODO: Clicking a Sankey strand opens a detail panel with the underlying transactions
- [ ] TODO: User can relabel a transaction's category from the detail panel
- [ ] TODO: Date range selector filters the Sankey and transaction views
- [ ] TODO: Display currency can be switched (USD/EUR/GBP/TRY) with live conversion
- [ ] TODO: Hovering a Sankey strand shows a tooltip with amount, count, and recurrence info
- [ ] TODO: Unit tests cover parsers, categorizer, dedup, and currency utilities

## Milestones

### M1 — MVP Foundation (Phase 0) — Mostly Complete

Working app with CSV upload, auto-categorization, and static Sankey visualization. Accounts CRUD, transaction import with dedup, and the core Sankey API are implemented. Parsers exist for 8 banks (BoA, Chase, Lloyds, HSBC, Amex, QNB Finansbank, Revolut, Trading 212) plus a generic fallback.

### M2 — Interactive Polish (Phase 1)

Strand click-to-drill-down, transaction relabeling, date range selector, currency switching, supplementary charts (donut, trend line, reserves bar), dark mode, and PDF parsing for HSBC.

### M3 — Intelligence & Connectivity (Phase 2–3)

LLM-powered categorization, spending anomaly detection, budget tracking, Plaid/Open Banking integration, cloud sync, and mobile-responsive layout.
