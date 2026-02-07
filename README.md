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
```

**Note:** There are no automated tests yet. See `TASKS.md` (T007–T009) for planned test setup.

## For AI Agents

If you are an AI coding agent, read these files in order:

1. `AGENTS.md` — contribution rules and coordination method
2. `TASKS.md` — task queue (pick an unassigned task)
3. `SPEC.md` — product specification and acceptance criteria
4. `API.md` — REST API reference
5. `PLAN.md` — architecture, data model, and design decisions
