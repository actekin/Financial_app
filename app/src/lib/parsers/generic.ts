import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, getCol } from './utils';
import { parseUSDate, parseUKDate, parseTurkishDate, parseISODate } from './utils';

// Generic parser for unmapped banks — user provides column mapping
export interface ColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string; // single signed amount
  debitColumn?: string;
  creditColumn?: string;
  balanceColumn?: string;
  dateFormat: 'US' | 'UK' | 'Turkish' | 'ISO';
}

export function parseWithMapping(
  csvData: Record<string, string>[],
  mapping: ColumnMapping,
  currency: Currency
): ParsedTransaction[] {
  const dateParsers = {
    US: parseUSDate,
    UK: parseUKDate,
    Turkish: parseTurkishDate,
    ISO: parseISODate,
  };
  const parseDate = dateParsers[mapping.dateFormat];

  return csvData
    .filter(row => row[mapping.dateColumn])
    .map(row => {
      const date = parseDate(row[mapping.dateColumn]);
      const description = row[mapping.descriptionColumn] || '';

      let amount: number;
      let direction: TransactionDirection;

      if (mapping.amountColumn) {
        const val = parseAmount(row[mapping.amountColumn]);
        direction = val < 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
        amount = Math.abs(val);
      } else if (mapping.debitColumn && mapping.creditColumn) {
        const debit = parseAmount(row[mapping.debitColumn]);
        const credit = parseAmount(row[mapping.creditColumn]);
        if (debit > 0) {
          amount = debit;
          direction = TransactionDirection.OUTFLOW;
        } else {
          amount = credit;
          direction = TransactionDirection.INFLOW;
        }
      } else {
        amount = 0;
        direction = TransactionDirection.OUTFLOW;
      }

      const balance = mapping.balanceColumn && row[mapping.balanceColumn]
        ? parseAmount(row[mapping.balanceColumn])
        : undefined;

      return { date, description, amount, direction, currency, balance, rawLine: row };
    });
}

export const genericParser: StatementParser = {
  bankId: Bank.QNB_FINANSBANK, // fallback
  supportedFormats: ['csv'],
  detect(): boolean { return false; }, // never auto-detect
  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    // Default: try common column names
    return csvData
      .filter(row => getCol(row, 'date'))
      .map(row => {
        const dateStr = getCol(row, 'date');
        const date = new Date(dateStr);
        const description = getCol(row, 'description', 'details', 'memo');

        const amountStr = getCol(row, 'amount');
        const val = parseAmount(amountStr);
        const direction = val < 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;

        return {
          date: isNaN(date.getTime()) ? new Date() : date,
          description,
          amount: Math.abs(val),
          direction,
          currency,
          rawLine: row,
        };
      });
  },
};
