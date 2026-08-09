# Demo data

Sample CSV statements for the demo walkthrough in [`DEMO.md`](../DEMO.md). Merchant names are chosen to exercise the auto-categorizer (salary, rent, groceries, subscriptions, travel, transfers…), and the two file shapes cover both parser paths: a signed `Amount` column (US style) and split `Money In (£)` / `Money Out (£)` columns (Lloyds style).

Upload each file to an account created with these exact settings, after saving the matching opening balance snapshot:

| File | Bank | Type | Currency | Snapshot (date → balance) |
|---|---|---|---|---|
| `demo-checking.csv` | Chase | Checking / Current | USD | 2026-05-31 → 12,500.00 |
| `demo-credit-card.csv` | Chase | Credit Card | USD | 2026-05-31 → -850.00 |
| `demo-lloyds.csv` | Lloyds | Checking / Current | GBP | 2026-05-31 → 6,300.00 |
| `demo-savings-statement.pdf` | Chase | Savings | USD | 2026-05-31 → 8,200.00 |

The bank selected on the account determines date parsing: Chase reads MM/DD/YYYY, Lloyds reads DD/MM/YYYY. Transactions span June 1 – August 7, 2026.

`demo-savings-statement.pdf` exercises the AI-powered PDF import path (its transfers mirror the checking CSV's "transfer to savings" rows). Uploading it requires `ANTHROPIC_API_KEY` to be set; skip it otherwise — the three CSVs make a complete demo on their own.
