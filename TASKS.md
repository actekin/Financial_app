# Task Queue

Task statuses: **Now** (ready to pick up), **In progress** (claimed), **Done**.

See `AGENTS.md` for workflow rules. See `SPEC.md` and `PLAN.md` for requirements context.

---

## Merge Train

Merge PRs in roughly this order to minimize conflicts. Tasks within the same wave are independent and can merge in any order.

**Wave 1** — no dependencies, can all start in parallel:
`T015` → `T010` → `T011` → `T006` → `T002` → `T001` → `T014`

**Wave 2** — depends on Wave 1 merges:
`T007, T008, T009` (after T015) → `T004` (after T001) → `T005` (after T001) → `T003` (after T006) → `T012a, T012b, T012c` → `T013` (after T015 + tests)

---

## Now

| ID    | Title                                              | Owner      | Contract Refs              | Dependencies | Key Files Touched                          |
|-------|----------------------------------------------------|------------|----------------------------|--------------|--------------------------------------------|
| T001  | Add strand click-to-drill-down panel               | unassigned | SPEC, PLAN §7.2            | —            | `components/sankey/`, new `components/layout/slide-panel.tsx` |
| T002  | Implement date range selector on dashboard         | unassigned | SPEC, PLAN §9.2            | —            | `app/page.tsx`, `api/sankey/route.ts`      |
| T006  | Implement currency conversion with exchange rate API | unassigned | PLAN §11, API            | —            | new `lib/currency/`, new `api/exchange-rates/` |
| T010  | Add single-account CRUD endpoints (`/api/accounts/[id]`) | unassigned | API, PLAN §8.2      | —            | new `api/accounts/[id]/route.ts`           |
| T011  | Add single-transaction endpoints (`/api/transactions/[id]`) | unassigned | API, PLAN §8.2    | —            | new `api/transactions/[id]/route.ts`       |
| T014  | Add inter-account transfer detection               | unassigned | PLAN §14, API              | —            | new `lib/utils/transfers.ts`, `api/upload/route.ts` |

## Blocked (waiting on dependencies)

| ID    | Title                                              | Owner      | Contract Refs              | Dependencies | Key Files Touched                          |
|-------|----------------------------------------------------|------------|----------------------------|--------------|--------------------------------------------|
| T004  | Add hover tooltips on Sankey strands               | unassigned | SPEC, PLAN §7.1            | T001 (shared `sankey/` files) | `components/sankey/sankey-chart.tsx` |
| T005  | Implement transaction relabeling UI                | unassigned | SPEC, API, PLAN §12        | T001         | `components/layout/slide-panel.tsx`        |
| T003  | Add display currency switcher                      | unassigned | SPEC, API, PLAN §11        | T006         | `app/page.tsx`, zustand store              |
| T007  | Write unit tests for parsers                       | unassigned | PLAN §17, SPEC             | T015         | new `__tests__/parsers/`                   |
| T008  | Write unit tests for categorizer engine            | unassigned | PLAN §17, SPEC             | T015         | new `__tests__/categorizer/`               |
| T009  | Write unit tests for dedup and money utils         | unassigned | PLAN §17, SPEC             | T015         | new `__tests__/utils/`                     |
| T012a | Add category breakdown donut chart                 | unassigned | SPEC, PLAN §7.3            | —            | new `components/charts/category-donut.tsx`  |
| T012b | Add monthly trend line chart                       | unassigned | SPEC, PLAN §7.3            | —            | new `components/charts/monthly-trend.tsx`   |
| T012c | Add reserves per-account bar chart                 | unassigned | SPEC, PLAN §7.3            | —            | new `components/charts/reserves-bar.tsx`    |
## In Progress

| ID | Title | Owner | Contract Refs | Dependencies |
|----|-------|-------|---------------|--------------|
| T015 | Set up Vitest test framework + first smoke test | QA agent | PLAN §17 | — |
| T013 | Set up CI pipeline (lint + typecheck + build + test) | QA agent | AGENTS | T015 |

## Done

| ID | Title | Owner | Contract Refs | Dependencies |
|----|-------|-------|---------------|--------------|
| —  | —     | —     | —             | —            |

---

## Notes

- **Wave 1 tasks are all independent** — start as many workers as you want on them simultaneously.
- **T015** (Vitest setup) should be the first to merge since it unblocks all test tasks and CI.
- **T001** (drill-down panel) unblocks T004 (tooltips) and T005 (relabeling) — these all touch `components/sankey/`.
- **T006** (currency conversion) unblocks T003 (currency switcher UI).
- **T012a/b/c** are independent of each other but are lower priority than T001–T006. They can start once the core interactive features are underway. Marked as blocked only to keep the "Now" section focused.
- **T013** (CI) can start as soon as T015 merges; it doesn't need all test tasks complete — it can run `lint + build` first and add `test` once tests exist.
- Vitest is now installed (`vitest ^4.0.18`). Config is at `app/vitest.config.ts`. Run `pnpm test` to execute. T007/T008/T009 can start immediately once T015 merges.
