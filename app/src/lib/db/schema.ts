import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bank: text('bank').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  currency: text('currency').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  groupName: text('group_name'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  date: text('date').notNull(),
  originalAmount: integer('original_amount').notNull(), // stored in cents
  originalCurrency: text('original_currency').notNull(),
  convertedAmount: integer('converted_amount'),
  convertedCurrency: text('converted_currency'),
  description: text('description').notNull(),
  rawDescription: text('raw_description').notNull(),
  direction: text('direction').notNull(), // 'inflow' | 'outflow'
  autoCategory: text('auto_category').notNull().default('other'),
  strandId: integer('strand_id'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  isTransfer: integer('is_transfer', { mode: 'boolean' }).notNull().default(false),
  excludeFromFlow: integer('exclude_from_flow', { mode: 'boolean' }).notNull().default(false),
  fingerprint: text('fingerprint'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const snapshots = sqliteTable('snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  date: text('date').notNull(),
  balance: integer('balance').notNull(), // stored in cents
  currency: text('currency').notNull(),
  source: text('source').notNull().default('manual'), // 'manual' | 'computed'
});

export const exchangeRates = sqliteTable('exchange_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  baseCurrency: text('base_currency').notNull(),
  targetCurrency: text('target_currency').notNull(),
  rate: real('rate').notNull(),
}, (table) => [
  uniqueIndex('rate_unique').on(table.date, table.baseCurrency, table.targetCurrency),
]);

export const uploadLogs = sqliteTable('upload_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  filename: text('filename').notNull(),
  uploadedAt: text('uploaded_at').notNull().default(sql`(datetime('now'))`),
  rowsImported: integer('rows_imported').notNull().default(0),
  rowsSkipped: integer('rows_skipped').notNull().default(0),
  dateRangeStart: text('date_range_start'),
  dateRangeEnd: text('date_range_end'),
  status: text('status').notNull().default('completed'),
});
