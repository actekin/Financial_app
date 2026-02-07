# Personal Financial Dashboard — Detailed Plan

## 1. Product Overview

A browser-based personal finance app that ingests transaction data from multiple bank accounts, credit cards, and investment accounts across three currencies (USD, EUR, TRY), and visualizes the user's financial position as an interactive Sankey-style flow chart showing:

- **Starting state**: reserves per account at a chosen start date
- **Flows**: all inflows (salary, transfers, etc.) and outflows (rent, subscriptions, travel, one-offs, etc.) between start date and today
- **Ending state**: current reserves per account

Clicking any flow strand reveals the underlying transactions. Transactions and strands are auto-labeled by category and can be manually relabeled.

---

## 2. Supported Accounts & Currencies

| Bank               | Country | Currency | Account Types              |
|--------------------|---------|----------|----------------------------|
| Bank of America    | US      | USD      | Checking, Savings, Credit  |
| Chase              | US      | USD      | Checking, Credit           |
| Lloyds             | UK      | GBP      | Current, Savings           |
| HSBC               | UK      | GBP      | Current, Savings, Credit   |
| QNB Finansbank     | Turkey  | TRY      | Current, Savings           |
| Revolut            | UK      | Multi    | GBP, EUR, USD, TRY pockets |
| Trading 212        | UK      | Multi    | Investment (Invest/ISA)    |

Display currency: user-selectable (USD, EUR, GBP, TRY). Cross-currency conversions use historical daily rates from an open API (e.g., ECB or exchangerate.host).

---

## 3. Tech Stack

| Layer              | Technology                                    | Rationale                                                       |
|--------------------|-----------------------------------------------|-----------------------------------------------------------------|
| Framework          | **Next.js 14+ (App Router)**                  | SSR/SSG, file-based routing, API routes, great DX               |
| Language           | **TypeScript**                                | Type safety across parsing, models, and UI                      |
| UI Components      | **shadcn/ui + Tailwind CSS**                  | Sleek, accessible, customizable component primitives            |
| Sankey Viz         | **D3.js (d3-sankey) + React SVG rendering**   | Maximum control over clickable strands, animations, styling     |
| Supporting Charts  | **Recharts**                                  | Bar/line/pie charts for supplementary views (per-account, etc.) |
| State Management   | **Zustand**                                   | Lightweight, no boilerplate, good for complex derived state     |
| Database           | **SQLite via better-sqlite3** (local-first)   | Zero config, file-based, runs in Node; all data stays local     |
| ORM                | **Drizzle ORM**                               | Type-safe, lightweight, excellent SQLite support                |
| File Parsing       | **Papa Parse** (CSV), **pdf-parse** (PDF)     | Mature, battle-tested parsers                                   |
| Auto-categorize    | **Rule engine (v0)** → LLM API (v1)          | Start with keyword rules; upgrade to AI later                   |
| Testing            | **Vitest + React Testing Library + Playwright**| Unit, component, and E2E coverage                              |
| Package Manager    | **pnpm**                                      | Fast, disk-efficient                                            |

### Why D3 over ECharts/Nivo for the Sankey

The main visualization is the core UX of this app. D3 gives full control over:
- Custom click handlers on individual strands and nodes
- Animated transitions when filtering by label or account
- Exact styling of the flow paths (gradient fills, thickness, curvature)
- Custom tooltip and drill-down panel positioning
- Layout modifications (e.g., grouping sub-strands by label)

The trade-off is more implementation effort, but this is the centerpiece of the app and warrants the investment.

---

## 4. Data Model

### 4.1 Core Tables

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   accounts   │     │   transactions   │     │     labels       │
├──────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)      │◄────│ account_id (FK)  │     │ id (PK)          │
│ bank         │     │ id (PK)          │     │ name             │
│ name         │     │ date             │     │ color            │
│ type         │     │ original_amount  │     │ type (enum)      │
│ currency     │     │ original_currency│     │   inflow/outflow │
│ is_active    │     │ converted_amount │     └──────────────────┘
│ group_name   │     │ converted_curr   │            ▲
│ created_at   │     │ description      │            │
                     │ raw_description  │     ┌──────┴───────────┐
                     │ direction (enum) │     │ transaction_labels│
                     │   inflow/outflow │     ├──────────────────┤
                     │ label_id (FK)    │────►│ transaction_id   │
                     │ auto_category    │     │ label_id         │
                     │ strand_id (FK)   │     └──────────────────┘
                     │ is_recurring     │
                     │ is_transfer      │     ┌──────────────────┐
                     │ exclude_from_flow│     │                  │
                     │ created_at       │     │     strands      │
                     └──────────────────┘     │                  │
                            │                 ├──────────────────┤
                            └────────────────►│ id (PK)          │
                                              │ name             │
                                              │ type (enum)      │
                                              │   inflow/outflow │
                                              │ label_id (FK)    │
                                              │ color            │
                                              └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│    snapshots     │     │   upload_logs    │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ account_id (FK)  │     │ account_id (FK)  │
│ date             │     │ filename         │
│ balance          │     │ uploaded_at      │
│ currency         │     │ rows_imported    │
│ source (manual/  │     │ rows_skipped     │
│   computed)      │     │ date_range_start │
└──────────────────┘     │ date_range_end   │
                         │ status           │
                         └──────────────────┘

┌──────────────────┐
│  exchange_rates  │
├──────────────────┤
│ date             │
│ base_currency    │
│ target_currency  │
│ rate             │
│ (PK: date+base+  │
│  target)         │
└──────────────────┘
```

### 4.2 Key Enumerations

```typescript
enum Bank {
  BANK_OF_AMERICA = 'bank_of_america',
  CHASE = 'chase',
  LLOYDS = 'lloyds',
  HSBC = 'hsbc',
  QNB_FINANSBANK = 'qnb_finansbank',
  REVOLUT = 'revolut',
  TRADING_212 = 'trading_212',
}

enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  TRY = 'TRY',
}

enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  MULTI_CURRENCY = 'multi_currency',
}

enum TransactionDirection {
  INFLOW = 'inflow',
  OUTFLOW = 'outflow',
}

// Auto-categories assigned by the rule engine
enum AutoCategory {
  SALARY = 'salary',
  FREELANCE_INCOME = 'freelance_income',
  INVESTMENT_RETURN = 'investment_return',
  INTEREST = 'interest',
  TRANSFER_IN = 'transfer_in',
  RENT = 'rent',
  MORTGAGE = 'mortgage',
  UTILITIES = 'utilities',
  SUBSCRIPTIONS = 'subscriptions',
  GROCERIES = 'groceries',
  DINING = 'dining',
  TRANSPORT = 'transport',
  TRAVEL = 'travel',
  HEALTH = 'health',
  INSURANCE = 'insurance',
  SHOPPING = 'shopping',
  FURNITURE = 'furniture',
  ELECTRONICS = 'electronics',
  ENTERTAINMENT = 'entertainment',
  EDUCATION = 'education',
  TAXES = 'taxes',
  FEES = 'fees',
  TRANSFER_OUT = 'transfer_out',
  ATM_WITHDRAWAL = 'atm_withdrawal',
  OTHER = 'other',
}
```

---

## 5. Bank Statement Parsers

Each bank gets a dedicated parser module implementing a common interface:

```typescript
interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;          // always positive
  direction: 'inflow' | 'outflow';
  currency: Currency;
  balance?: number;        // if available in the statement
  rawLine: Record<string, string>; // original CSV row for debugging
}

interface StatementParser {
  bankId: Bank;
  supportedFormats: string[];            // e.g. ['csv', 'xlsx']
  detect(file: File): Promise<boolean>;  // auto-detect if file is from this bank
  parse(file: File): Promise<ParsedTransaction[]>;
}
```

### Per-Bank Parser Details

#### 5.1 Bank of America
- **Input**: XLS/XLSX (exported from online banking), or CSV after manual conversion
- **Columns**: `Date`, `Description`, `Amount` (signed, negative = debit) — OR — `Date`, `Description`, `Debit`, `Credit`
- **Date format**: `MM/DD/YYYY`
- **Quirks**: May need xlsx parsing (via SheetJS); no native CSV. Handle both column layouts.
- **Detection**: Look for "Bank of America" in header rows or characteristic column names.

#### 5.2 Chase
- **Input**: CSV
- **Columns**: `Date`, `Description`, `Amount` (personal) or `Date`, `Description`, `Debit`, `Credit` (business)
- **Date format**: `MM/DD/YYYY`
- **Quirks**: Clean numeric values (no `$` symbol). Personal vs business layouts differ.
- **Detection**: Column header pattern matching.

#### 5.3 Lloyds
- **Input**: CSV, QIF
- **Columns**: `Date`, `Description`, `Type`, `Money In (£)`, `Money Out (£)`, `Balance (£)`
- **Date format**: `DD/MM/YYYY`
- **Quirks**: Max 90 days / 150 transactions per file. User may need to upload multiple files. Uses "Money In"/"Money Out" naming.
- **Detection**: "Money In" / "Money Out" column headers.

#### 5.4 HSBC
- **Input**: CSV (business) or PDF (personal — requires pdf-parse + regex extraction)
- **Columns (CSV)**: `Date`, `Description`, `Paid Out`, `Paid In`
- **Date format**: `DD/MM/YYYY`
- **Quirks**: Personal banking may only offer PDF. Need a PDF statement parser fallback using pdf-parse with regex patterns to extract tabular data.
- **Detection**: "Paid Out" / "Paid In" headers, or PDF header containing "HSBC".

#### 5.5 QNB Finansbank
- **Input**: CSV (format not publicly documented)
- **Approach**: Provide a generic CSV mapper UI where the user maps columns (date, description, amount, direction) manually for the first upload. Save the mapping for future uploads.
- **Date format**: Likely `DD.MM.YYYY` (Turkish convention)
- **Detection**: Manual bank selection by user.

#### 5.6 Revolut
- **Input**: CSV (one per currency pocket)
- **Columns**: `Date started`, `Date completed`, `Description`, `Amount`, `Currency`, `Balance`, `Fee`, `Category`
- **Date format**: ISO-ish or `DD/MM/YYYY`
- **Quirks**: Separate files per currency. Already includes a `Category` field — use it as a hint for auto-categorization.
- **Detection**: Presence of `Fee`, `Currency` columns; or header row pattern.

#### 5.7 Trading 212
- **Input**: CSV
- **Columns**: `Action`, `Time`, `ISIN`, `Ticker`, `Name`, `No. of shares`, `Price / share`, `Currency (Price / share)`, `Exchange rate`, `Result`, `Total`, `Withholding tax`
- **Date format**: Timestamp
- **Quirks**: Investment-oriented data. "Action" types include `Market buy`, `Market sell`, `Dividend`, `Deposit`, `Withdrawal`. Map deposits/withdrawals as inflows/outflows; dividends as investment returns. Share purchases are not outflows from the user's perspective (they're still reserves, just in a different form) — handle this with an investment account type.
- **Detection**: Presence of `ISIN`, `Ticker`, `No. of shares` columns.

### Parser Architecture

```
src/lib/parsers/
├── index.ts              # Parser registry, auto-detection
├── types.ts              # ParsedTransaction, StatementParser interface
├── base-parser.ts        # Shared utilities (date parsing, amount normalization)
├── bank-of-america.ts
├── chase.ts
├── lloyds.ts
├── hsbc.ts
├── qnb-finansbank.ts
├── revolut.ts
├── trading-212.ts
└── generic-csv.ts        # Fallback: user-mapped columns
```

---

## 6. Auto-Categorization Engine

### v0: Rule-Based Engine

A keyword-matching engine that assigns an `AutoCategory` to each transaction based on its description. Rules are ordered by specificity (most specific first).

```typescript
interface CategoryRule {
  category: AutoCategory;
  patterns: RegExp[];           // match against description
  amountRange?: { min?: number; max?: number };
  direction?: 'inflow' | 'outflow';
  bank?: Bank;                  // bank-specific rules
}
```

**Example rules:**

```typescript
const rules: CategoryRule[] = [
  // Inflows
  { category: 'salary', patterns: [/payroll/i, /salary/i, /wages/i, /direct deposit/i], direction: 'inflow' },
  { category: 'interest', patterns: [/interest paid/i, /interest earned/i], direction: 'inflow' },
  { category: 'investment_return', patterns: [/dividend/i, /capital gain/i], direction: 'inflow' },

  // Outflows — Recurring
  { category: 'rent', patterns: [/rent/i, /landlord/i], direction: 'outflow' },
  { category: 'utilities', patterns: [/electric/i, /gas bill/i, /water bill/i, /thames water/i, /british gas/i, /edf/i], direction: 'outflow' },
  { category: 'subscriptions', patterns: [/netflix/i, /spotify/i, /youtube premium/i, /apple\s*(music|tv|one)/i, /amazon prime/i, /hulu/i, /disney/i, /nyt/i, /medium/i, /chatgpt/i, /openai/i, /github/i, /icloud/i], direction: 'outflow' },
  { category: 'insurance', patterns: [/insurance/i, /geico/i, /allstate/i, /aviva/i], direction: 'outflow' },

  // Outflows — Variable
  { category: 'groceries', patterns: [/tesco/i, /sainsbury/i, /waitrose/i, /lidl/i, /aldi/i, /whole foods/i, /trader joe/i, /kroger/i, /migros/i, /bim/i, /a101/i, /sok market/i], direction: 'outflow' },
  { category: 'dining', patterns: [/restaurant/i, /cafe/i, /starbucks/i, /mcdonald/i, /uber\s*eats/i, /deliveroo/i, /grubhub/i, /doordash/i, /just\s*eat/i, /yemeksepeti/i], direction: 'outflow' },
  { category: 'transport', patterns: [/uber(?!\s*eat)/i, /lyft/i, /taxi/i, /tfl/i, /metro/i, /bus/i, /train/i, /rail/i, /iett/i, /istanbulkart/i], direction: 'outflow' },
  { category: 'travel', patterns: [/airline/i, /airbnb/i, /booking\.com/i, /hotel/i, /ryanair/i, /easyjet/i, /british airways/i, /turkish air/i, /pegasus/i, /thy/i], direction: 'outflow' },
  { category: 'health', patterns: [/pharmacy/i, /doctor/i, /hospital/i, /dental/i, /optician/i], direction: 'outflow' },
  { category: 'shopping', patterns: [/amazon(?!\s*prime)/i, /ebay/i, /zara/i, /h&m/i, /uniqlo/i, /asos/i], direction: 'outflow' },
  { category: 'furniture', patterns: [/ikea/i, /wayfair/i, /furniture/i, /mattress/i, /sofa/i], direction: 'outflow' },
  { category: 'electronics', patterns: [/apple store/i, /best buy/i, /currys/i, /media markt/i], direction: 'outflow' },

  // Transfers
  { category: 'transfer_in', patterns: [/transfer from/i, /incoming transfer/i], direction: 'inflow' },
  { category: 'transfer_out', patterns: [/transfer to/i, /outgoing transfer/i], direction: 'outflow' },
  { category: 'atm_withdrawal', patterns: [/atm/i, /cash withdrawal/i, /cashpoint/i], direction: 'outflow' },

  // Catch-all
  { category: 'other', patterns: [/.*/], direction: undefined },
];
```

### Recurring Detection

Identify recurring transactions by grouping transactions with similar descriptions and checking for regular intervals:

```typescript
interface RecurrenceDetector {
  // Group transactions by normalized description
  // Check if occurrences happen at regular intervals (weekly, monthly, quarterly, annually)
  // Mark as recurring if ≥ 2 occurrences at consistent intervals (± 3 day tolerance)
  detect(transactions: ParsedTransaction[]): RecurrenceGroup[];
}
```

### v1 Enhancement: LLM Categorization

In a future version, send uncategorized or low-confidence transactions to an LLM API (Claude) for categorization:

```
Prompt: "Categorize this transaction: '{description}', amount: {amount} {currency}, date: {date}.
Choose from: [salary, rent, groceries, ...]. Respond with just the category name."
```

---

## 7. Visualization Design

### 7.1 Main Sankey Flow Chart

The centerpiece of the app. The chart flows left to right:

```
 ┌─────────────────┐                                          ┌─────────────────┐
 │  STARTING STATE  │                                          │  ENDING STATE    │
 │                  │                                          │                  │
 │  BofA: $12,000  │──────────────────────────────────────────►│  BofA: $8,500   │
 │  Chase: $5,200  │──────────────────────────────────────────►│  Chase: $4,100  │
 │  Lloyds: £3,100 │──────────────────────────────────────────►│  Lloyds: £2,800 │
 │  HSBC: £1,500   │──────────────────────────────────────────►│  HSBC: £1,200   │
 │  QNB: ₺45,000   │──────────────────────────────────────────►│  QNB: ₺38,000  │
 │  Revolut: €2,000│──────────────────────────────────────────►│  Revolut: €1,500│
 │  T212: £8,000   │──────────────────────────────────────────►│  T212: £9,200   │
 │                  │                                          │                  │
 └─────────────────┘                                          └─────────────────┘
         ▲                                                           │
         │              ┌──────────────────────┐                     │
         │              │      INFLOWS         │                     │
         │◄─────────────│  Salary: $6,500/mo   │                     │
         │◄─────────────│  Freelance: $2,100   │                     │
         │◄─────────────│  Dividends: £340     │                     │
         │◄─────────────│  Interest: £12       │                     │
         │              └──────────────────────┘                     │
         │                                                           │
         │              ┌──────────────────────┐                     │
         │              │     OUTFLOWS         │                     ▼
         │──────────────►  Rent: $2,200/mo     │─────────────────────│
         │──────────────►  Groceries: $450/mo  │─────────────────────│
         │──────────────►  Subscriptions: $89  │─────────────────────│
         │──────────────►  Travel: $1,340      │─────────────────────│
         │──────────────►  Dining: $620        │─────────────────────│
         │──────────────►  Furniture: $2,100   │─────────────────────│
         │              └──────────────────────┘                     │
         │                                                           │
```

**Key visual properties:**
- Strand **thickness** is proportional to the amount
- Strand **color** is determined by its label/category
- Inflows enter from the top; outflows exit from the bottom
- Hovering a strand shows a tooltip with: label, total amount, transaction count, recurring vs. one-off
- **Clicking** a strand opens a slide-out panel with the full transaction list

### 7.2 Strand Interaction

When a strand is clicked, a right-side panel slides in showing:

```
┌──────────────────────────────────────┐
│  ← Rent                    $8,800   │
│  Monthly recurring • 4 transactions  │
│──────────────────────────────────────│
│  ☐ Jan 1   Landlord Payment  $2,200 │
│  ☐ Feb 1   Landlord Payment  $2,200 │
│  ☐ Mar 1   Landlord Payment  $2,200 │
│  ☐ Apr 1   Landlord Payment  $2,200 │
│──────────────────────────────────────│
│  [Rename Strand]  [Change Color]     │
│  [Split Strand]   [Merge Into...]    │
└──────────────────────────────────────┘
```

Each transaction row can be:
- Clicked to edit its label
- Dragged to a different strand
- Individually recategorized

### 7.3 Supplementary Views

Below or alongside the main Sankey:

1. **Reserves per Account** — horizontal bar chart showing each account's balance at start vs. end, with currency labels
2. **Category Breakdown** — donut/pie chart of outflows by category
3. **Monthly Trend** — line chart of net cash flow per month within the date range
4. **Currency Exposure** — stacked bar showing how reserves are distributed across currencies

---

## 8. Application Architecture

### 8.1 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (sidebar, header)
│   ├── page.tsx                  # Main dashboard (Sankey view)
│   ├── accounts/
│   │   └── page.tsx              # Account management
│   ├── upload/
│   │   └── page.tsx              # File upload & import
│   ├── transactions/
│   │   └── page.tsx              # Full transaction list/table
│   ├── labels/
│   │   └── page.tsx              # Label/strand management
│   └── settings/
│       └── page.tsx              # Currency preferences, date range
│
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── slide-panel.tsx       # Right-side transaction detail panel
│   │
│   ├── sankey/
│   │   ├── sankey-chart.tsx      # Main Sankey component
│   │   ├── sankey-node.tsx       # Account/category nodes
│   │   ├── sankey-link.tsx       # Flow strands (clickable)
│   │   ├── sankey-tooltip.tsx    # Hover tooltips
│   │   └── sankey-layout.ts     # D3 layout computation
│   │
│   ├── charts/
│   │   ├── reserves-bar.tsx     # Per-account reserves
│   │   ├── category-donut.tsx   # Outflow breakdown
│   │   ├── monthly-trend.tsx    # Net cash flow over time
│   │   └── currency-exposure.tsx
│   │
│   ├── upload/
│   │   ├── file-dropzone.tsx    # Drag-and-drop upload area
│   │   ├── bank-selector.tsx    # Bank/account picker
│   │   ├── column-mapper.tsx    # For generic CSV mapping
│   │   ├── import-preview.tsx   # Preview parsed transactions
│   │   └── import-summary.tsx   # Post-import results
│   │
│   ├── transactions/
│   │   ├── transaction-table.tsx
│   │   ├── transaction-row.tsx
│   │   └── transaction-editor.tsx
│   │
│   └── ui/                      # shadcn/ui components
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── select.tsx
│       └── ...
│
├── lib/
│   ├── parsers/                 # Bank statement parsers (see §5)
│   ├── categorizer/
│   │   ├── rules.ts             # Category rule definitions
│   │   ├── engine.ts            # Rule matching engine
│   │   └── recurrence.ts        # Recurring transaction detector
│   ├── currency/
│   │   ├── converter.ts         # Currency conversion logic
│   │   └── rates.ts             # Exchange rate fetching/caching
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   ├── client.ts            # Database connection
│   │   └── migrations/          # SQL migrations
│   └── utils/
│       ├── date.ts              # Date parsing/formatting helpers
│       ├── money.ts             # Monetary arithmetic (avoid floats)
│       └── dedup.ts             # Duplicate transaction detection
│
├── store/
│   ├── accounts.ts              # Account state
│   ├── transactions.ts          # Transaction state
│   ├── labels.ts                # Label/strand state
│   ├── filters.ts               # Date range, currency, account filters
│   └── ui.ts                    # UI state (selected strand, panel open, etc.)
│
└── types/
    ├── account.ts
    ├── transaction.ts
    ├── label.ts
    ├── strand.ts
    └── sankey.ts                # Sankey-specific data types
```

### 8.2 API Routes (Next.js Route Handlers)

```
src/app/api/
├── accounts/
│   ├── route.ts                 # GET (list), POST (create)
│   └── [id]/route.ts            # GET, PUT, DELETE
├── transactions/
│   ├── route.ts                 # GET (list with filters), POST (bulk create)
│   ├── [id]/route.ts            # GET, PUT, DELETE
│   └── categorize/route.ts      # POST — re-run auto-categorization
├── upload/
│   └── route.ts                 # POST — upload and parse statement file
├── labels/
│   ├── route.ts                 # GET, POST
│   └── [id]/route.ts            # PUT, DELETE
├── strands/
│   ├── route.ts                 # GET (computed), POST (create custom)
│   └── [id]/route.ts            # PUT (rename, recolor), DELETE
├── snapshots/
│   └── route.ts                 # GET, POST (account balance snapshots)
├── exchange-rates/
│   └── route.ts                 # GET (fetch/cache rates for date range)
└── sankey/
    └── route.ts                 # GET — computed Sankey data structure
```

---

## 9. Key User Flows

### 9.1 First-Time Setup

```
1. User opens app → sees empty dashboard with "Get Started" prompt
2. User goes to Accounts page → adds their accounts (bank, name, currency, type)
3. User goes to Upload page:
   a. Selects account (or app auto-detects bank from file)
   b. Drags/drops statement file(s)
   c. App parses file, shows preview of transactions
   d. User confirms import
   e. App runs auto-categorization
   f. Shows import summary (X transactions imported, Y categories assigned)
4. User sets start date on dashboard
5. User enters starting balances for each account (or app infers from first transaction's balance field)
6. Dashboard renders the Sankey chart
```

### 9.2 Exploring the Dashboard

```
1. User sees the main Sankey: starting reserves → flows → ending reserves
2. Hovers over "Dining" strand → tooltip: "$620 total, 23 transactions, recurring"
3. Clicks "Dining" strand → right panel slides in with all 23 dining transactions
4. Notices "Uber Eats" is categorized as "Transport" → drags it to "Dining" strand
5. Clicks "Rename Strand" on a strand labeled "Other" → renames to "Home Office"
6. Toggles view to "Group by Label" → sees all strands with the same label merged
7. Switches display currency from USD to GBP → all amounts re-convert
8. Adjusts date range slider → chart re-renders for the new period
```

### 9.3 Ongoing Use

```
1. At month-end, user downloads new statements from each bank
2. Goes to Upload page, uploads the new files
3. App detects duplicates (by date + amount + description hash) and skips them
4. New transactions appear in the Sankey chart
5. User reviews any "Other" categorized transactions and relabels them
```

---

## 10. Duplicate Detection

When importing transactions, duplicates are detected using a composite key:

```typescript
function transactionFingerprint(tx: ParsedTransaction, accountId: string): string {
  return hash([
    accountId,
    tx.date.toISOString().slice(0, 10),  // date only
    tx.amount.toFixed(2),
    tx.direction,
    normalizeDescription(tx.description),
  ].join('|'));
}
```

If a fingerprint already exists in the database, the transaction is skipped. Edge case: same-day duplicate legitimate transactions (e.g., two coffees at Starbucks) — these need a user confirmation step.

---

## 11. Currency Handling

### Principles
- All amounts are stored in their **original currency** (`original_amount` + `original_currency`)
- A **converted amount** is computed and stored for display purposes (`converted_amount` + `converted_currency`)
- Conversion uses the exchange rate on the transaction date
- The user can switch the display currency at any time; converted amounts are recomputed
- **Never use floating point for money.** Store amounts as integers (cents/pence/kuruş) internally.

### Exchange Rate Source
- Use [exchangerate.host](https://exchangerate.host) or ECB SDMX API (free, no key needed)
- Cache rates in the `exchange_rates` table
- Fetch rates lazily: when a transaction in currency X needs conversion to currency Y on date D, check cache first, fetch if missing
- Rates are fetched per-day granularity

### Display Formatting

```typescript
const formatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
  TRY: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }),
};
```

---

## 12. Strand & Label System

### Strands vs. Labels

- A **strand** is a visual flow in the Sankey chart. It groups transactions.
- A **label** is a user-defined or auto-assigned category name (e.g., "Rent", "Salary").
- Multiple strands can share the same label (e.g., "Rent" paid from different accounts).
- Users can **merge** strands (combine two into one) or **split** them (separate out specific transactions).
- The "Group by Label" view merges all strands with the same label into one thick strand.

### Auto-Strand Generation

When the Sankey is computed, strands are generated by:

1. Group transactions by `auto_category` (or manual label if overridden)
2. Within each category, sub-group by account if showing per-account flows
3. Each group becomes a strand
4. Strand thickness = sum of transaction amounts in that group
5. Strand color = label color (user-customizable, defaults from a palette)

### Label Editing

- Click a transaction → inline dropdown to change its label
- Click a strand → rename the strand's label (applies to all transactions in it)
- Labels page: manage all labels, see transaction counts, merge labels, set colors
- "Visualize by label" toggle: when on, strands are grouped purely by label regardless of account

---

## 13. Implementation Phases

### Phase 0 — Foundation (MVP)

**Goal:** Working app with manual CSV upload, auto-categorization, and interactive Sankey.

| Step | Task | Priority |
|------|------|----------|
| 0.1  | Scaffold Next.js + TypeScript + Tailwind + shadcn/ui project | P0 |
| 0.2  | Set up SQLite + Drizzle ORM, define schema, run migrations | P0 |
| 0.3  | Build account management page (CRUD for accounts) | P0 |
| 0.4  | Implement CSV parsers for all 7 banks + generic fallback | P0 |
| 0.5  | Build file upload page with drag-drop, bank auto-detect, preview | P0 |
| 0.6  | Implement auto-categorization rule engine | P0 |
| 0.7  | Implement recurring transaction detection | P0 |
| 0.8  | Build the Sankey chart with D3 (static render, no interaction) | P0 |
| 0.9  | Add click-to-drill-down on strands (slide panel with transaction list) | P0 |
| 0.10 | Add hover tooltips on strands | P0 |
| 0.11 | Implement strand renaming and transaction relabeling | P0 |
| 0.12 | Build "Reserves per Account" bar chart | P1 |
| 0.13 | Implement duplicate detection on import | P0 |
| 0.14 | Add date range selector and display currency switcher | P0 |
| 0.15 | Currency conversion with exchange rate API + caching | P0 |
| 0.16 | Responsive layout for desktop (min 1024px viewport) | P1 |

### Phase 1 — Polish & Power Features

| Step | Task |
|------|------|
| 1.1  | Category breakdown donut chart |
| 1.2  | Monthly trend line chart |
| 1.3  | Currency exposure chart |
| 1.4  | Strand merging and splitting |
| 1.5  | "Group by Label" visualization toggle |
| 1.6  | Label management page |
| 1.7  | Sankey animation on filter/date changes |
| 1.8  | PDF statement parsing (for HSBC personal) |
| 1.9  | Dark mode |
| 1.10 | Export data (CSV, JSON) |
| 1.11 | Keyboard shortcuts |

### Phase 2 — Intelligence

| Step | Task |
|------|------|
| 2.1  | LLM-powered auto-categorization (Claude API) |
| 2.2  | Spending anomaly detection (unusual amounts) |
| 2.3  | Budget tracking (set limits per category, show progress) |
| 2.4  | Projected future balance based on recurring patterns |
| 2.5  | Multi-period comparison (this month vs. last month) |
| 2.6  | OFX/QFX file format support |

### Phase 3 — Connectivity

| Step | Task |
|------|------|
| 3.1  | Plaid / TrueLayer / Open Banking API integration for auto-sync |
| 3.2  | User authentication (for multi-device access) |
| 3.3  | Cloud sync (migrate from SQLite to PostgreSQL) |
| 3.4  | Mobile-responsive layout |
| 3.5  | PWA support (installable, offline-first) |

---

## 14. Inter-Account Transfers

A special case: money moving between the user's own accounts (e.g., Chase → Revolut). These should:

1. Be detected: same amount, opposite directions, within ±2 days, between the user's accounts
2. Not inflate inflow/outflow totals
3. Be rendered as a horizontal strand between two account nodes in the Sankey, not as a top-level inflow or outflow
4. Be labeled automatically as "Internal Transfer"

Detection logic:

```typescript
function detectTransfers(transactions: Transaction[]): TransferPair[] {
  // For each outflow, find a matching inflow in a different account
  // within ±2 days with matching amount (after currency conversion)
  // Mark both transactions as transfer_in / transfer_out
  // Return pairs for Sankey rendering
}
```

---

## 15. Monetary Precision

All monetary values are stored as **integers in the smallest currency unit**:

| Currency | Unit    | Example: $12.50 stored as |
|----------|---------|--------------------------|
| USD      | cents   | 1250                     |
| EUR      | cents   | 1250                     |
| GBP      | pence   | 1250                     |
| TRY      | kuruş   | 1250                     |

This avoids floating-point errors in aggregation. Display formatting divides by 100.

---

## 16. Performance Considerations

- **Sankey computation** is done server-side (API route) and cached; re-computed only when transactions change or filters change
- **Transaction table** uses virtual scrolling (e.g., TanStack Virtual) for large lists
- **Exchange rates** are cached in DB; fetched once per day per currency pair
- **File parsing** happens client-side (no need to upload raw files to a server); parsed transactions are sent via API
- **SQLite** handles up to ~100K transactions without performance issues on a single machine

---

## 17. Testing Strategy

| Level       | Tool                    | Coverage Target                                    |
|-------------|-------------------------|----------------------------------------------------|
| Unit        | Vitest                  | Parsers, categorizer, currency converter, dedup     |
| Component   | React Testing Library   | Sankey interactions, upload flow, transaction editor |
| Integration | Vitest + DB             | API routes, full import pipeline                    |
| E2E         | Playwright              | Upload → categorize → visualize → relabel flow     |

### Critical Test Cases

- Each parser correctly handles its bank's format (sample files in `__fixtures__/`)
- Duplicate detection skips exact duplicates but keeps legitimate same-day transactions
- Currency conversion is accurate to ±0.01 of expected value
- Sankey strand click opens correct transaction list
- Relabeling a transaction updates the Sankey in real time
- Date range change re-renders the Sankey correctly
- Import of overlapping date ranges doesn't create duplicates

---

## 18. Security & Privacy

- All data is stored locally (SQLite file on the user's machine)
- No data leaves the device in v0 (no cloud, no analytics, no telemetry)
- Statement files are parsed client-side; raw files are not persisted
- When LLM categorization is added (v2), only transaction descriptions are sent (no account numbers, no balances)
- No authentication needed in v0 (single-user, local app)

---

## 19. Design Decisions (Resolved)

### 1. Investment Account Handling — Deposits/Withdrawals Only

Only cash moving in/out of Trading 212 appears as flows in the Sankey. Stock purchases and sales are **not** rendered as outflows/inflows (since the money is still yours, just in a different form). Market gains/losses are represented as a separate "Market Movement" strand that explains the delta between total deposits and current portfolio value. Individual trades are accessible in the Trading 212 account detail view but do not clutter the main flow chart.

**Implications for the parser**: Trading 212 CSV `Action` values are mapped as follows:
- `Deposit` → inflow strand into Trading 212 node
- `Withdrawal` → outflow strand from Trading 212 node
- `Dividend` → inflow strand (categorized as `investment_return`)
- `Market buy` / `Market sell` → stored in DB but excluded from Sankey flows; used only to compute portfolio value for the "Market Movement" strand
- Net unrealized gain/loss = (current portfolio value) − (total deposits − total withdrawals) → rendered as a special "Market Movement" strand

### 2. Credit Card Treatment — Spending-Based

Credit card transactions (the actual purchases: groceries, dining, etc.) are the outflows in the Sankey, categorized by what was bought. Bill payments from a checking account to the credit card are treated as **internal transfers** and hidden from the top-level Sankey to avoid double-counting.

The credit card account node shows:
- **Starting state**: balance owed (displayed as negative reserves, e.g., "Chase CC: −$1,200")
- **Ending state**: current balance owed

This means the user sees what they actually spent money *on*, not just a opaque "credit card bill" lump.

**Implications for inter-account transfer detection**: The transfer detector (§14) must recognize credit card payments. Heuristic: an outflow from a checking account with description matching `/payment|credit card|card payment/i` that roughly matches a reduction in credit card balance within ±3 days.

### 3. Multi-Currency Display — Single Currency with Native Tooltip

The Sankey renders all amounts in a single user-selected display currency (USD, GBP, EUR, or TRY). This makes strand thickness directly comparable. The user can switch display currency at any time via a dropdown.

On hover, tooltips show **both** the converted amount and the original amount in native currency:
```
Rent: $2,200/mo (£1,740/mo)
23 transactions • Monthly recurring
```

This preserves the "real" numbers while keeping the chart visually coherent.

### 4. Revolut — Separate Accounts, Grouped Display

Each Revolut currency pocket (GBP, EUR, USD, TRY) is modeled as a **separate account** in the database (e.g., "Revolut GBP", "Revolut EUR"). This matches how Revolut exports data (one CSV per pocket) and simplifies the parser and data model.

In the UI, these accounts are **visually grouped** under a "Revolut" header:
- Account list shows: `▼ Revolut` → `Revolut GBP: £1,200` / `Revolut EUR: €800` / ...
- Sankey starting/ending nodes can be toggled between expanded (one node per pocket) and collapsed (one "Revolut" node showing combined value in display currency)
- The `accounts` table gets an optional `group_name` field for this grouping

```sql
ALTER TABLE accounts ADD COLUMN group_name TEXT; -- e.g., 'Revolut'
```
