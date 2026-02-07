# Agent Contribution Guide

This document defines the rules and coordination methods for AI coding agents (Codex, Claude, etc.) working on this repository in parallel, air-gapped sessions.

---

## Core Rules

1. **One task = one branch.**
   Never combine unrelated changes. If a task grows too large, split it into multiple branches.

2. **Never commit directly to `main`.**
   All changes go on feature branches. The human supervisor creates PRs and handles merging.

3. **Keep changes small.**
   Smaller diffs are easier to review, less likely to conflict, and faster to merge. If your diff exceeds ~400 lines, consider splitting into multiple branches/tasks.

4. **Contracts are law.**
   The following files are authoritative contracts. Code must conform to them, not the other way around:
   - `SPEC.md` — product specification, goals, acceptance criteria
   - `API.md` — REST API conventions and endpoint definitions
   - `PLAN.md` — architecture, data model, implementation phases
   - `app/src/lib/db/client.ts` — database schema (inline SQL)

5. **Update docs when behavior changes.**
   Any branch that changes API endpoints, database schema, configuration, workflows, or user-facing behavior **must** update the corresponding contract files in the same commit(s).

6. **Every branch must include "How to test".**
   Add a `## How to test` section at the top of your last commit message explaining how a reviewer can verify the change. If lint, build, or tests exist, the code must pass them.

7. **Branch naming convention:**
   Use descriptive branch names: `feat/<short-desc>`, `fix/<short-desc>`, `docs/<short-desc>`, `refactor/<short-desc>`.

---

## Coordination Method (Air-Gapped Sessions)

Agents do **not** share chat memory or session context. Coordination happens entirely through repository artifacts:

### How agents stay in sync

| Channel               | Purpose                                                |
|------------------------|--------------------------------------------------------|
| `TASKS.md`            | Task queue — claim tasks, check what's in progress     |
| `SPEC.md`             | Product requirements — what to build and acceptance criteria |
| `API.md`              | API contract — endpoint signatures and conventions     |
| `PLAN.md`             | Architecture and design decisions                      |
| PR descriptions        | Explain *what* and *why* for each change               |
| PR review comments     | Feedback, requested changes, blockers                  |
| Commit messages        | Concise record of what changed                         |

### Workflow for picking up a task

1. Read `TASKS.md` to find an unassigned task in the **Now** section.
2. Read `SPEC.md`, `API.md`, and `PLAN.md` for relevant context.
3. Create a branch, implement the change, update contracts if needed.
4. Commit and push your branch. **Do not open a PR yourself.** The human supervisor will create the PR through their interface.
5. Move the task to **In progress** in `TASKS.md` within your branch.

### Avoiding conflicts

- Check `TASKS.md` and open branches/PRs before starting work to avoid duplicating effort.
- If two tasks touch the same files, note the dependency in `TASKS.md`.
- Prefer additive changes over modifications to shared code when possible.

### Important: Agents do NOT create PRs

The human supervisor owns the PR workflow. As an agent, your job is to:
1. Implement on a feature branch.
2. Commit with clear messages (include "How to test" in the final commit).
3. Push the branch to the remote.
The supervisor will then create the PR and manage the review/merge process.

---

## Contract Files Reference

| File                       | What it governs                                   |
|----------------------------|---------------------------------------------------|
| `SPEC.md`                 | Product goals, non-goals, user flows, milestones  |
| `API.md`                  | REST endpoint definitions and conventions          |
| `PLAN.md`                 | Architecture, tech stack, data model, phases       |
| `TASKS.md`                | Task queue and ownership                           |
| `AGENTS.md` (this file)   | Agent workflow rules and coordination              |
| `app/src/lib/db/client.ts`| Database schema (SQLite, inline CREATE TABLE)      |

---

## Quick Reference: Available Commands

```bash
cd app

# Install dependencies
pnpm install

# Development server (http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Lint
pnpm lint

# Type-check (no emit)
pnpm typecheck

# Run unit tests (Vitest)
pnpm test

# Run tests in watch mode during development
pnpm test:watch
```

## Quality Gates (CI)

Every PR targeting `main` runs the GitHub Actions workflow in `.github/workflows/ci.yml`:

| Gate        | Command          | Blocking? |
|-------------|------------------|-----------|
| Lint        | `pnpm lint`      | No (pre-existing errors; will become blocking once fixed) |
| Typecheck   | `pnpm typecheck` | **Yes**   |
| Test        | `pnpm test`      | **Yes**   |
| Build       | `pnpm build`     | **Yes**   |

Before pushing a branch, verify locally:

```bash
cd app && pnpm typecheck && pnpm test && pnpm build
```

### Writing Tests

- Test framework: **Vitest** (config: `app/vitest.config.ts`)
- Test file pattern: `src/**/*.test.ts`
- Path alias `@/` resolves to `src/` in tests
- Place tests in `__tests__/` directories next to the code they test
- See existing tests in `src/lib/categorizer/__tests__/` and `src/lib/utils/__tests__/` for examples
