import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, parseUKDate, getCol } from './utils';

export const amexParser: StatementParser = {
  bankId: Bank.AMEX,
  supportedFormats: ['csv'],

  detect(headers: string[]): boolean {
    const lower = headers.map(h => h.toLowerCase().trim());
    // Amex UK CSV: Date, Reference, Amount, Description (or similar)
    return (
      lower.includes('date') &&
      lower.includes('amount') &&
      (lower.includes('reference') || lower.includes('description'))
    );
  },

  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    return csvData
      .filter(row => getCol(row, 'date'))
      .map(row => {
        const dateStr = getCol(row, 'date');
        // Amex UK uses DD/MM/YYYY. Some exports may use other formats.
        let date: Date;
        try {
          date = parseUKDate(dateStr);
        } catch {
          date = new Date(dateStr);
        }

        const description = getCol(row, 'description', 'details', 'reference');
        const val = parseAmount(getCol(row, 'amount'));

        // Amex: positive = charge (outflow), negative = payment/credit (inflow)
        const direction = val > 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
        const amount = Math.abs(val);

        return { date, description, amount, direction, currency, rawLine: row };
      });
  },
};
