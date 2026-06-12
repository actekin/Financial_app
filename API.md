# API Reference — FinFlow

## Conventions

- **Base path:** `/api`
- **Framework:** Next.js App Router route handlers (`app/src/app/api/`)
- **Auth:** Optional shared-household password. When the `FINFLOW_PASSWORD` env var is set, all endpoints except `POST /api/auth/login` require a valid `finflow_session` cookie (enforced centrally in `app/src/proxy.ts`); unauthenticated API calls get `401 {"error":"Unauthorized"}` and page requests redirect to `/login`. When the env var is unset, auth is disabled (local single-user mode).
- **Content-Type:** `application/json` for all request/response bodies
- **Error shape:** `{ "error": "<message>" }` with appropriate HTTP status code
- **Amounts:** Stored and returned as integers in smallest currency unit (cents/pence/kuruş). Clients divide by 100 for display.
- **Dates:** ISO 8601 date strings (`YYYY-MM-DD`)

---

## Endpoints

### `POST /api/auth/login`

Sign in with the shared household password. Public (no session required).

**Request body:**
```json
{ "name": "Arda", "password": "household-password" }
```

`name` identifies which household member is signing in and is recorded on uploads and snapshots (`uploadedBy` / `updatedBy`).

**Response:** `200 OK` — `{ "name": "Arda" }`, sets the `finflow_session` HTTP-only cookie (valid 90 days).

**Errors:**
- `400` — Auth not enabled, or missing/too-long name
- `401` — Incorrect password

### `POST /api/auth/logout`

Clear the session cookie. **Response:** `200 OK` — `{ "success": true }`

### `GET /api/auth/me`

Get the current session. **Response:** `200 OK` — `{ "authEnabled": true, "name": "Arda" }` (`name` is `null` when signed out; `authEnabled` is `false` when `FINFLOW_PASSWORD` is unset).

---

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
- When auth is enabled, the signed-in user's name is recorded as `uploaded_by` on the upload log.

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
- When auth is enabled, the signed-in user's name is recorded as `updatedBy`.

**Response:** `201 Created` (new) or `200 OK` (updated) — the snapshot object.

### `POST /api/snapshots/batch`

Upsert balance snapshots for many accounts in one request (powers the Quick Update page).

**Request body:**
```json
{
  "snapshots": [
    { "accountId": 1, "date": "2026-06-12", "balance": 1500.25, "currency": "USD" },
    { "accountId": 2, "date": "2026-06-12", "balance": 820.10 }
  ]
}
```

**Notes:**
- `currency` is optional; defaults to the account's currency.
- Same upsert semantics as `POST /api/snapshots`, applied per entry.
- Invalid entries are reported in `errors` without failing the batch.

**Response:** `200 OK` — `{ "saved": 2, "errors": [] }`

---

### `GET /api/freshness`

Per-account data freshness — when each active account last received a transaction, balance snapshot, or upload. Powers the Quick Update page and the dashboard's stale-data warning.

**Response:** `200 OK`
```json
[
  {
    "account": { "id": 1, "name": "Chase Checking", "bank": "chase", "currency": "USD" },
    "latestSnapshot": { "date": "2026-06-12", "balance": 150025, "currency": "USD", "source": "manual", "updatedBy": "Arda", "updatedAt": "2026-06-12 15:13:18" },
    "lastTransactionDate": "2026-06-10",
    "transactionCount": 42,
    "lastUpload": { "uploadedAt": "2026-06-12 15:13:18", "filename": "chase_jun.csv", "uploadedBy": "Arda" },
    "lastDataDate": "2026-06-12"
  }
]
```

`lastDataDate` is the most recent of the snapshot date and last transaction date — the date through which the account's picture is accurate. Fields are `null` when no data exists.

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
