# FinFlow — Household Finance Dashboard

A self-hosted finance app for two: ingest bank statements (CSV), auto-categorize transactions, visualize money flows as an interactive Sankey diagram, set savings goals together, and ask an AI advisor questions like *"does the business-class upgrade make sense this month?"* — answered from your real cash position, live spending data, and saving targets, with supporting charts.

## Features

- **Dashboard** — cash position, income/spending this month vs your trailing average, monthly spending trend, savings goals at a glance, and the Sankey flow diagram with click-to-drill-down.
- **AI Advisor** — natural-language Q&A grounded in your live data. Every answer comes with a verdict (go for it / hold off / tight), plain-language reasoning citing your numbers, and the charts that support it. Powered by Claude (`ANTHROPIC_API_KEY` required).
- **Savings goals** — set targets with deadlines, log contributions manually or link a goal to an account so it tracks the balance automatically; see the required monthly saving to stay on track.
- **Statement import** — CSV parsers for 8 banks (BoA, Chase, Lloyds, HSBC, Amex, QNB Finansbank, Revolut, Trading 212) plus a generic fallback, and **PDF statement import** from any bank via AI extraction (`ANTHROPIC_API_KEY` required), with dedup and rule-based auto-categorization.
- **Household access** — shared-password login (`APP_PASSWORD`) with per-person names, signed session cookies, and a mobile-friendly layout. Installable as a home-screen app on iPhone/Android/Mac (see [DEPLOYMENT.md](DEPLOYMENT.md#using-finflow-on-your-iphone-and-your-partners)) so both of you use the same live data from any device.

## Developer Quickstart

**Prerequisites:** Node.js 20+, pnpm

```bash
cd app
cp .env.example .env.local   # optional: set APP_PASSWORD / ANTHROPIC_API_KEY
pnpm install
pnpm dev                     # http://localhost:3000
```

Without `APP_PASSWORD`, auth is disabled (open local dev). Without `ANTHROPIC_API_KEY`, everything works except the Advisor's natural-language answers (its charts still render).

Want a populated demo? **[DEMO.md](DEMO.md)** walks through seeding sample accounts and statements from [`demo-data/`](demo-data/), and explains what to export from your real banks for a full household picture.

**Other commands:**

```bash
pnpm build        # Production build
pnpm start        # Run the production build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript
pnpm test         # Vitest
```

## Deploying for your household

See **[DEPLOYMENT.md](DEPLOYMENT.md)** — one container + one persistent volume. Covers Fly.io, Railway/Render, and home-server Docker Compose, plus backups.

## For AI Agents

If you are an AI coding agent, read these files in order:

1. `AGENTS.md` — contribution rules and coordination method
2. `TASKS.md` — task queue (pick an unassigned task)
3. `SPEC.md` — product specification and acceptance criteria
4. `API.md` — REST API reference
5. `PLAN.md` — architecture, data model, and design decisions
