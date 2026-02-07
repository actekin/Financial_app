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

## Planned Endpoints (TODO)

These endpoints are defined in `PLAN.md` but not yet implemented:

| Endpoint                        | Purpose                                    |
|---------------------------------|--------------------------------------------|
| `GET/PUT/DELETE /api/accounts/[id]` | Single account read/update/delete       |
| `GET/PUT/DELETE /api/transactions/[id]` | Single transaction operations        |
| `POST /api/transactions/categorize` | Re-run auto-categorization on existing data |
| `CRUD /api/labels`              | Label/strand management                    |
| `CRUD /api/strands`             | Custom strand creation and editing         |
| `GET /api/exchange-rates`       | Fetch/cache historical exchange rates      |
