# Task Queue

Task statuses: **Now** (ready to pick up), **In progress** (claimed), **Done**.

See `AGENTS.md` for workflow rules. See `SPEC.md` and `PLAN.md` for requirements context.

---

## Now

| ID   | Title                                        | Owner      | Contract Refs        | Dependencies |
|------|----------------------------------------------|------------|----------------------|--------------|
| T001 | Add strand click-to-drill-down panel         | unassigned | SPEC, PLAN §7.2      | —            |
| T002 | Implement date range selector on dashboard   | unassigned | SPEC, PLAN §9.2      | —            |
| T003 | Add display currency switcher                | unassigned | SPEC, API, PLAN §11  | T006         |
| T004 | Add hover tooltips on Sankey strands         | unassigned | SPEC, PLAN §7.1      | —            |
| T005 | Implement transaction relabeling UI          | unassigned | SPEC, API, PLAN §12  | T001         |
| T006 | Implement currency conversion with exchange rate API | unassigned | PLAN §11, API (exchange-rates) | —  |
| T007 | Write unit tests for parsers                 | unassigned | PLAN §17, SPEC       | —            |
| T008 | Write unit tests for categorizer engine      | unassigned | PLAN §17, SPEC       | —            |
| T009 | Write unit tests for dedup and money utils   | unassigned | PLAN §17, SPEC       | —            |
| T010 | Add single-account CRUD endpoints (`/api/accounts/[id]`) | unassigned | API, PLAN §8.2 | —  |
| T011 | Add single-transaction endpoints (`/api/transactions/[id]`) | unassigned | API, PLAN §8.2 | — |
| T012 | Implement supplementary charts (donut, trend, reserves bar) | unassigned | SPEC, PLAN §7.3 | — |
| T013 | Set up CI pipeline (lint + build + test)     | unassigned | AGENTS               | T007, T008, T009 |
| T014 | Add inter-account transfer detection         | unassigned | PLAN §14, API        | —            |

## In progress

| ID   | Title | Owner | Contract Refs | Dependencies |
|------|-------|-------|---------------|--------------|
| —    | —     | —     | —             | —            |

## Done

| ID   | Title | Owner | Contract Refs | Dependencies |
|------|-------|-------|---------------|--------------|
| —    | —     | —     | —             | —            |

---

## Notes

- **T001–T005** are the highest-priority interactive features needed to complete the MVP user experience (SPEC M2).
- **T006** (currency conversion) is a prerequisite for T003 (currency switcher).
- **T007–T009** can be worked in parallel and are prerequisites for T013 (CI).
- **T010–T011** are API completeness tasks; the current endpoints handle most use cases but lack single-resource routes.
- **T014** (transfer detection) is important for accurate Sankey rendering but can be deferred.
- Vitest and Playwright are listed as devDependencies in PLAN.md but are not yet installed. Test tasks (T007–T009) should install and configure them first.
