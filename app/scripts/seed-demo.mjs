#!/usr/bin/env node
// Seed a running FinFlow instance with demo data: 4 accounts, ~76
// transactions (Mar–Jun 2026), and starting/current balance snapshots.
// One account (Revolut) is left without a recent balance so the Quick
// Update staleness badges and dashboard warning have something to show.
//
// Usage:
//   1. Start the app:  FINFLOW_PASSWORD=demo pnpm start   (or pnpm dev)
//   2. Seed:           node scripts/seed-demo.mjs
//
// Env vars: FINFLOW_URL (default http://localhost:3000),
//           FINFLOW_PASSWORD (default "demo"), FINFLOW_NAME (default "Demo").
// Safe to re-run: existing accounts are reused by name, transaction dedup
// skips duplicates, snapshots upsert.

const BASE = process.env.FINFLOW_URL || 'http://localhost:3000';
const PASSWORD = process.env.FINFLOW_PASSWORD || 'demo';
const NAME = process.env.FINFLOW_NAME || 'Demo';

let cookie = null;

async function req(path, data, method) {
  const res = await fetch(BASE + path, {
    method: method || (data ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const tx = (date, description, amount, direction, currency) =>
  ({ date, description, amount, direction, currency });

async function main() {
  const me = await req('/api/auth/me');
  if (me.authEnabled) {
    await req('/api/auth/login', { name: NAME, password: PASSWORD });
    console.log(`Signed in as ${NAME}`);
  } else {
    console.log('Auth disabled — seeding without sign-in');
  }

  // Reuse accounts by name so re-running the script doesn't duplicate them
  const existing = await req('/api/accounts');
  const ensureAccount = async (spec) => {
    const found = existing.find(a => a.name === spec.name);
    return found ? found.id : (await req('/api/accounts', spec)).id;
  };

  const chase = await ensureAccount({ bank: 'chase', name: 'Chase Checking', type: 'checking', currency: 'USD' });
  const lloyds = await ensureAccount({ bank: 'lloyds', name: 'Lloyds Current', type: 'checking', currency: 'GBP' });
  const revolut = await ensureAccount({ bank: 'revolut', name: 'Revolut GBP', type: 'checking', currency: 'GBP', groupName: 'Revolut' });
  const t212 = await ensureAccount({ bank: 'trading_212', name: 'Trading 212 ISA', type: 'investment', currency: 'GBP' });
  console.log('Accounts', { chase, lloyds, revolut, t212 });

  const chaseTxns = [];
  for (const m of ['03', '04', '05']) {
    chaseTxns.push(
      tx(`2026-${m}-25`, 'ACME CORP PAYROLL DIRECT DEPOSIT', 6500.0, 'inflow', 'USD'),
      tx(`2026-${m}-01`, 'LANDLORD RENT PAYMENT', 2200.0, 'outflow', 'USD'),
      tx(`2026-${m}-03`, 'WHOLE FOODS MARKET', 184.2, 'outflow', 'USD'),
      tx(`2026-${m}-10`, 'TRADER JOES #552', 96.75, 'outflow', 'USD'),
      tx(`2026-${m}-12`, 'NETFLIX.COM', 15.49, 'outflow', 'USD'),
      tx(`2026-${m}-14`, 'UBER TRIP', 23.4, 'outflow', 'USD'),
      tx(`2026-${m}-18`, 'STARBUCKS #1234', 6.85, 'outflow', 'USD'),
      tx(`2026-${m}-20`, 'GEICO INSURANCE', 142.0, 'outflow', 'USD'),
      tx(`2026-${m}-22`, 'DOORDASH ORDER', 38.5, 'outflow', 'USD'),
    );
  }
  chaseTxns.push(
    tx('2026-06-01', 'LANDLORD RENT PAYMENT', 2200.0, 'outflow', 'USD'),
    tx('2026-06-05', 'WHOLE FOODS MARKET', 162.3, 'outflow', 'USD'),
    tx('2026-06-08', 'AIRBNB HMQXKT', 840.0, 'outflow', 'USD'),
    tx('2026-06-10', 'UNITED AIRLINES', 612.4, 'outflow', 'USD'),
  );

  const lloydsTxns = [];
  for (const m of ['03', '04', '05']) {
    lloydsTxns.push(
      tx(`2026-${m}-28`, 'FREELANCE CLIENT INVOICE', 1800.0, 'inflow', 'GBP'),
      tx(`2026-${m}-02`, 'THAMES WATER', 42.0, 'outflow', 'GBP'),
      tx(`2026-${m}-04`, 'BRITISH GAS', 88.5, 'outflow', 'GBP'),
      tx(`2026-${m}-07`, 'TESCO STORES 3412', 76.2, 'outflow', 'GBP'),
      tx(`2026-${m}-15`, 'SAINSBURYS LOCAL', 31.45, 'outflow', 'GBP'),
      tx(`2026-${m}-16`, 'TFL TRAVEL CHARGE', 38.9, 'outflow', 'GBP'),
      tx(`2026-${m}-21`, 'SPOTIFY UK', 11.99, 'outflow', 'GBP'),
      tx(`2026-${m}-27`, 'INTEREST PAID', 4.12, 'inflow', 'GBP'),
    );
  }

  const revolutTxns = [];
  for (const m of ['03', '04', '05']) {
    revolutTxns.push(
      tx(`2026-${m}-06`, 'DELIVEROO', 28.4, 'outflow', 'GBP'),
      tx(`2026-${m}-09`, 'PRET A MANGER', 9.15, 'outflow', 'GBP'),
      tx(`2026-${m}-13`, 'TRANSFER FROM LLOYDS', 400.0, 'inflow', 'GBP'),
      tx(`2026-${m}-19`, 'ZARA LONDON', 64.99, 'outflow', 'GBP'),
      tx(`2026-${m}-24`, 'EASYJET FLIGHT', 89.99, 'outflow', 'GBP'),
    );
  }

  const t212Txns = [];
  for (const m of ['03', '04', '05']) {
    t212Txns.push(
      tx(`2026-${m}-26`, 'Deposit', 500.0, 'inflow', 'GBP'),
      tx(`2026-${m}-30`, 'Dividend AAPL', 12.4, 'inflow', 'GBP'),
    );
  }

  for (const [accountId, filename, transactions] of [
    [chase, 'chase_mar_jun_2026.csv', chaseTxns],
    [lloyds, 'lloyds_mar_jun_2026.csv', lloydsTxns],
    [revolut, 'revolut_gbp_mar_jun_2026.csv', revolutTxns],
    [t212, 'trading212_mar_jun_2026.csv', t212Txns],
  ]) {
    const result = await req('/api/upload', { accountId, filename, transactions });
    console.log(filename, result);
  }

  const snapshots = await req('/api/snapshots/batch', {
    snapshots: [
      { accountId: chase, date: '2026-03-01', balance: 12000.0 },
      { accountId: lloyds, date: '2026-03-01', balance: 3100.0 },
      { accountId: revolut, date: '2026-03-01', balance: 950.0 },
      { accountId: t212, date: '2026-03-01', balance: 8000.0 },
      { accountId: chase, date: '2026-06-12', balance: 14890.45 },
      { accountId: lloyds, date: '2026-06-12', balance: 4480.12 },
      { accountId: t212, date: '2026-06-01', balance: 9620.0 },
      // Revolut intentionally gets no recent snapshot — see staleness UI
    ],
  });
  console.log('Snapshots', snapshots);
  console.log(`\nDone. Open ${BASE} and explore the dashboard, /quick-update, and /upload.`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
