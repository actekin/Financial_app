import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, parseUSDate, getCol } from './utils';

export const bankOfAmericaParser: StatementParser = {
  bankId: Bank.BANK_OF_AMERICA,
  supportedFormats: ['csv'],

  detect(headers: string[]): boolean {
    const lower = headers.map(h => h.toLowerCase().trim());
    return (
      lower.includes('date') &&
      lower.includes('description') &&
      (lower.includes('amount') || (lower.includes('debit') && lower.includes('credit')))
    );
  },

  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    return csvData
      .filter(row => getCol(row, 'date'))
      .map(row => {
        const date = parseUSDate(getCol(row, 'date'));
        const description = getCol(row, 'description');

        // Handle single Amount column (negative = debit) or separate Debit/Credit
        let amount: number;
        let direction: TransactionDirection;

        const amountStr = getCol(row, 'amount');
        if (amountStr) {
          const val = parseAmount(amountStr);
          direction = val < 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
          amount = Math.abs(val);
        } else {
          const debit = parseAmount(getCol(row, 'debit'));
          const credit = parseAmount(getCol(row, 'credit'));
          if (debit > 0) {
            amount = debit;
            direction = TransactionDirection.OUTFLOW;
          } else {
            amount = credit;
            direction = TransactionDirection.INFLOW;
          }
        }

        const balance = getCol(row, 'balance') ? parseAmount(getCol(row, 'balance')) : undefined;

        return { date, description, amount, direction, currency, balance, rawLine: row };
      });
  },
};
