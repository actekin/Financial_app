# Agent Contribution Guide

This document defines the rules and coordination methods for AI coding agents (Codex, Claude, etc.) working on this repository in parallel, air-gapped sessions.

---

## Core Rules

1. **One task = one branch = one PR.**
   Never combine unrelated changes. If a task grows too large, split it into multiple PRs.

2. **Never commit directly to `main`.**
   All changes go through pull requests and must be reviewed before merging.

3. **Keep PRs small.**
   Smaller PRs are easier to review, less likely to conflict, and faster to merge. If your diff exceeds ~400 lines, consider splitting.

4. **Contracts are law.**
   The following files are authoritative contracts. Code must conform to them, not the other way around:
   - `SPEC.md` — product specification, goals, acceptance criteria
   - `API.md` — REST API conventions and endpoint definitions
   - `PLAN.md` — architecture, data model, implementation phases
   - `app/src/lib/db/client.ts` — database schema (inline SQL)

5. **Update docs when behavior changes.**
   Any PR that changes API endpoints, database schema, configuration, workflows, or user-facing behavior **must** update the corresponding contract files in the same PR.

6. **Every PR must include "How to test".**
   The PR description must contain a section explaining how a reviewer can verify the change. If lint, build, or tests exist, the PR must pass them.

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
4. Open a PR using the PR template (`.github/pull_request_template.md`).
5. Move the task to **In progress** in `TASKS.md` within your PR.

### Avoiding conflicts

- Check `TASKS.md` and open PRs before starting work to avoid duplicating effort.
- If two tasks touch the same files, note the dependency in `TASKS.md`.
- Prefer additive changes over modifications to shared code when possible.

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
```

> **Note:** There are no automated tests yet. Vitest and Playwright are planned but not configured with test files. See `TASKS.md` for the testing task.
