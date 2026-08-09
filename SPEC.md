# Product Specification — FinFlow

## Goal

FinFlow is a local-first, browser-based personal finance dashboard that ingests bank statements (CSV or PDF) from multiple accounts across multiple currencies, auto-categorizes transactions, and visualizes all money flows as an interactive Sankey diagram. The app prioritizes privacy and clarity (one chart tells the full financial story). CSV statements are parsed entirely in the browser and never leave the user's machine. PDF import is an explicit opt-in exception: it only functions when the operator configures `ANTHROPIC_API_KEY`, and using it sends the statement document to the Anthropic API for extraction — the Upload page labels the PDF path as AI-extracted, and all other data stays local.

## Non-Goals

- **Not a bank connector.** No Plaid/Open Banking integration. (Planned for Phase 3.)
- **No per-user data separation.** Household members share one dataset behind one shared password (`APP_PASSWORD`); there are no individual accounts or permissions.
- **No LLM categorization.** Rule-based engine only; the LLM powers the advisor and PDF transaction extraction, not import categorization.

> Shipped beyond the original MVP scope: shared-password auth with sessions, single-container deployment (Dockerfile + guide), savings goals, the AI advisor, dashboard charts, a mobile-responsive layout, PDF statement import (AI-extracted, opt-in via `ANTHROPIC_API_KEY` — supersedes the earlier "no PDF parsing" non-goal), and home-screen installability (PWA manifest + icons).

## Core User Flows

1. **Account setup** — User creates accounts (bank, name, currency, type) via the Accounts page.
2. **Statement upload** — User uploads bank statement files via the Upload page. CSVs are parsed in the browser using the selected account's bank format; PDFs are extracted server-side via the Anthropic API (requires `ANTHROPIC_API_KEY`). Either way the user reviews a preview, then the app deduplicates against existing data and auto-categorizes on import.
3. **Balance snapshot** — User enters starting account balances (or the app infers them from statement data) so the Sankey can show starting/ending reserves.
4. **Sankey exploration** — User views the main dashboard showing a Sankey diagram: starting reserves → inflows/outflows by category → ending reserves. Hovering shows tooltips; clicking a strand opens a transaction detail panel.
5. **Transaction relabeling** — User can recategorize individual transactions or rename entire strands to correct auto-categorization errors.
6. **Date range filtering** — User adjusts the date range to see flows for a specific period.
7. **TODO:** Currency switching — User switches display currency; all amounts re-convert using historical rates.
8. **TODO:** Supplementary charts — Category breakdown donut, monthly trend line, reserves bar chart.

## Acceptance Criteria

- [x] User can create, list, and delete bank accounts
- [x] User can upload CSV files and see parsed transactions imported
- [x] Duplicate transactions (same date, amount, description, account) are skipped on re-import
- [x] Transactions are auto-categorized by a regex rule engine on import
- [x] The dashboard renders a Sankey diagram from transaction data
- [x] Sankey API computes nodes and links grouped by category and direction
- [x] Household members sign in with a shared password; sessions persist 30 days per device
- [x] User can create savings goals (manual contributions or linked to an account balance) with target dates and required-monthly-saving guidance
- [x] User can ask the AI advisor natural-language money questions and get a verdict + reasoning + supporting charts computed from live data
- [x] Dashboard shows cash position, current month vs trailing-average tracking, monthly spending trend, and goal progress
- [x] App ships with a Dockerfile and deployment guide for live household access
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
