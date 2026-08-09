# API Reference — FinFlow

## Conventions

- **Base path:** `/api`
- **Framework:** Next.js App Router route handlers (`app/src/app/api/`)
- **Auth:** None (local-first, single-user app)
- **Content-Type:** `application/json` for all request/response bodies
- **Error shape:** `{ "error": "<message>" }` with appropriate HTTP status code
- **Amounts:** Stored and returned as integers in smallest currency unit (cents/pence/kuruş). Clients divide by 100 for display.
- **Dates:** ISO 8601 date strings (`YYYY-MM-DD`)

---

## Endpoints

### `GET /api/accounts`

List all accounts.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "bank": "chase",
    "name": "Chase Checking",
    "type": "checking",
    "currency": "USD",
    "isActive": true,
    "groupName": null,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

### `POST /api/accounts`

Create a new account.

**Request body:**
```json
{
  "bank": "chase",
  "name": "Chase Checking",
  "type": "checking",
  "currency": "USD",
  "groupName": null
}
```

**Required fields:** `bank`, `name`, `type`, `currency`

**Response:** `201 Created` — the created account object.

### `DELETE /api/accounts?id={id}`

Delete an account by ID.

**Response:** `200 OK` — `{ "success": true }`

---

### `GET /api/accounts/[id]`

Get a single account by ID.

**Response:** `200 OK` — the account object.

**Errors:**
- `400` — Invalid account id (non-numeric)
- `404` — Account not found

### `PUT /api/accounts/[id]`

Update a single account.

**Request body** (all fields optional, at least one required):
```json
{
  "bank": "lloyds",
  "name": "Lloyds Current",
  "type": "checking",
  "currency": "GBP",
  "groupName": null,
  "isActive": true
}
```

**Response:** `200 OK` — the updated account object.

**Errors:**
- `400` — Invalid account id or no fields to update
- `404` — Account not found

### `DELETE /api/accounts/[id]`

Delete a single account and all related data (transactions, snapshots, upload logs).

**Response:** `200 OK` — `{ "success": true }`

**Errors:**
- `400` — Invalid account id
- `404` — Account not found

---

### `GET /api/transactions`

List transactions with optional filters.

**Query parameters:**
| Param       | Type   | Description                          |
|-------------|--------|--------------------------------------|
| `accountId` | int    | Filter by account                    |
| `startDate` | string | Filter transactions on or after date |
| `endDate`   | string | Filter transactions on or before date|
| `category`  | string | Filter by `auto_category` value      |

**Response:** `200 OK` — array of transaction objects, ordered by date descending.

### `PUT /api/transactions`

Update a transaction's mutable fields.

**Request body:**
```json
{
  "id": 42,
  "autoCategory": "dining",
  "description": "Updated description",
  "direction": "outflow"
}
```

**Required:** `id`. At least one of `autoCategory`, `description`, `direction` must be provided.

**Response:** `200 OK` — `{ "success": true }`

---

### `POST /api/upload`

Import transactions from a parsed CSV file.

**Request body:**
```json
{
  "accountId": 1,
  "filename": "chase_jan_2025.csv",
  "transactions": [
    {
      "date": "2025-01-15",
      "description": "STARBUCKS #1234",
      "amount": 5.50,
      "direction": "outflow",
      "currency": "USD",
      "balance": 1234.56,
      "excludeFromFlow": false
    }
  ]
}
```

**Notes:**
- `amount` is a decimal (e.g., `5.50`); the server converts to cents.
- Deduplication is automatic via fingerprint hashing.
- Auto-categorization runs on each transaction during import.

**Response:** `200 OK`
```json
{
  "imported": 45,
  "skipped": 3,
  "dateRange": { "start": "2025-01-01", "end": "2025-01-31" }
}
```

---

### `GET /api/sankey`

Compute Sankey diagram data for a date range.

**Query parameters (required):**
| Param       | Type   | Description       |
|-------------|--------|-------------------|
| `startDate` | string | Period start date |
| `endDate`   | string | Period end date   |

**Response:** `200 OK`
```json
{
  "nodes": [
    { "id": "start", "label": "Starting Reserves", "type": "start_total", "value": 150000 },
    { "id": "inflow_salary", "label": "Salary", "type": "inflow", "value": 650000, "color": "#22c55e" },
    { "id": "outflow_rent", "label": "Rent", "type": "outflow", "value": 220000, "color": "#ef4444" }
  ],
  "links": [
    { "source": "inflow_salary", "target": "end", "value": 650000, "color": "#22c55e", "category": "salary", "count": 1 },
    { "source": "start", "target": "outflow_rent", "value": 220000, "color": "#ef4444", "category": "rent", "count": 1 }
  ],
  "summary": {
    "startBalance": 150000,
    "endBalance": 180000,
    "totalInflows": 650000,
    "totalOutflows": 620000,
    "netFlow": 30000
  },
  "accounts": [
    { "id": 1, "name": "Chase Checking", "startBalance": 150000, "endBalance": 180000 }
  ]
}
```

---

### `GET /api/snapshots`

List account balance snapshots.

**Query parameters:**
| Param       | Type | Description            |
|-------------|------|------------------------|
| `accountId` | int  | Filter by account (optional) |

**Response:** `200 OK` — array of snapshot objects.

### `POST /api/snapshots`

Create or update (upsert) an account balance snapshot.

**Request body:**
```json
{
  "accountId": 1,
  "date": "2025-01-01",
  "balance": 1500.00,
  "currency": "USD",
  "source": "manual"
}
```

**Notes:**
- `balance` is a decimal; the server converts to cents.
- If a snapshot already exists for the same `accountId` + `date`, it is updated (upsert).

**Response:** `201 Created` (new) or `200 OK` (updated) — the snapshot object.

---

### `GET /api/goals`

Returns all savings goals enriched with computed progress: `savedAmount` (from the linked account balance when `linkedAccountId` is set, otherwise the stored manual value), `progressPct`, `remainingAmount`, `monthsLeft`, and `requiredMonthlySaving`.

### `POST /api/goals`

Create a goal. Body (amounts in major units, converted to cents server-side): `{ name, emoji?, targetAmount, savedAmount?, currency, targetDate?, linkedAccountId?, notes? }` → `201` with the row.

### `PUT /api/goals/[id]`

Partial update; same fields as create. Also accepts `addContribution` (major units, may be negative) to increment `savedAmount` atomically. → `200` with the row.

### `DELETE /api/goals/[id]`

→ `{ "success": true }` or `404`.

---

### `GET /api/advisor/context`

Returns the computed `FinancialContext`: per-account balances and totals by currency, a 13-point monthly income/spending series in the primary currency, current-month stats (projected spend, trailing averages, % vs average), category comparisons, largest expenses this month, and goal progress.

### `POST /api/advisor`

Body: `{ question: string, history?: [{role, content}] }`. Builds the financial context, asks Claude, and returns `{ advice: { verdict, headline, reasoning, chartKeys }, context }`. Returns `503` with a helpful message (and the `context`) when `ANTHROPIC_API_KEY` is not configured.

---

### `POST /api/parse-pdf`

Extract transactions from a PDF bank/credit-card statement using Claude (model set by `PDF_PARSER_MODEL`, default `claude-opus-5`). The client then feeds the returned transactions into the normal preview → `POST /api/upload` flow.

**Request body:**
```json
{
  "filename": "statement.pdf",
  "pdfBase64": "<base64-encoded PDF, max 20MB decoded>",
  "currency": "USD"
}
```

`currency` is the fallback account currency when the statement doesn't specify one.

**Response:** `200 OK`
```json
{
  "transactions": [
    {
      "date": "2026-06-15T00:00:00.000Z",
      "description": "ONLINE TRANSFER FROM CHECKING",
      "amount": 800.0,
      "direction": "inflow",
      "currency": "USD",
      "excludeFromFlow": false
    }
  ],
  "warnings": ["Page 3 was partially unreadable"]
}
```

**Errors:** `400` missing `pdfBase64` · `413` PDF over 20MB · `503` `ANTHROPIC_API_KEY` not configured · `502` model refusal, truncation, or upstream API error.

---

### Auth — `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

Enabled when `APP_PASSWORD` is set. `login` body: `{ name, password }` → sets a signed, httpOnly session cookie (30 days). `me` → `{ authEnabled, user, members }`. All other routes and pages require the cookie via `middleware.ts` when auth is enabled.

---

## Planned Endpoints (TODO)

These endpoints are defined in `PLAN.md` but not yet implemented:

| Endpoint                        | Purpose                                    |
|---------------------------------|--------------------------------------------|
| `GET/PUT/DELETE /api/transactions/[id]` | Single transaction operations        |
| `POST /api/transactions/categorize` | Re-run auto-categorization on existing data |
| `CRUD /api/labels`              | Label/strand management                    |
| `CRUD /api/strands`             | Custom strand creation and editing         |
| `GET /api/exchange-rates`       | Fetch/cache historical exchange rates      |
