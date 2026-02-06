import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, parseUKDate, getCol } from './utils';

export const hsbcParser: StatementParser = {
  bankId: Bank.HSBC,
  supportedFormats: ['csv'],

  detect(headers: string[]): boolean {
    const lower = headers.map(h => h.toLowerCase().trim());
    return (
      lower.includes('date') &&
      (lower.some(h => h.includes('paid out')) || lower.some(h => h.includes('paid in')))
    );
  },

  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    return csvData
      .filter(row => getCol(row, 'date'))
      .map(row => {
        const date = parseUKDate(getCol(row, 'date'));
        const description = getCol(row, 'description', 'details');

        const paidOut = parseAmount(getCol(row, 'paid out'));
        const paidIn = parseAmount(getCol(row, 'paid in'));

        // If single Amount column exists
        const amountStr = getCol(row, 'amount');
        let amount: number;
        let direction: TransactionDirection;

        if (amountStr && !paidOut && !paidIn) {
          const val = parseAmount(amountStr);
          direction = val < 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
          amount = Math.abs(val);
        } else {
          direction = paidIn > 0 ? TransactionDirection.INFLOW : TransactionDirection.OUTFLOW;
          amount = paidIn > 0 ? paidIn : paidOut;
        }

        return { date, description, amount, direction, currency, rawLine: row };
      });
  },
};
