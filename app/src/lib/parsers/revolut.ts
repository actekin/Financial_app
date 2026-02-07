import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, parseISODate, parseUKDate, getCol } from './utils';

export const revolutParser: StatementParser = {
  bankId: Bank.REVOLUT,
  supportedFormats: ['csv'],

  detect(headers: string[]): boolean {
    const lower = headers.map(h => h.toLowerCase().trim());
    return (
      lower.some(h => h.includes('date') || h.includes('started') || h.includes('completed')) &&
      (lower.includes('amount') || lower.includes('fee')) &&
      lower.some(h => h.includes('description') || h.includes('currency'))
    );
  },

  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    return csvData
      .filter(row =>
        getCol(row, 'date started', 'date completed', 'date', 'completed date', 'started date')
      )
      .map(row => {
        const dateStr = getCol(row, 'date completed', 'completed date', 'date started', 'started date', 'date');
        let date: Date;
        try {
          date = parseISODate(dateStr);
        } catch {
          date = parseUKDate(dateStr);
        }

        const description = getCol(row, 'description', 'transaction description');

        const amountStr = getCol(row, 'amount');
        const val = parseAmount(amountStr);
        const direction = val < 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
        const amount = Math.abs(val);

        // Use the currency column from the CSV if available, otherwise use account currency
        const csvCurrency = getCol(row, 'currency');
        const txCurrency = csvCurrency && Object.values(Currency).includes(csvCurrency as Currency)
          ? (csvCurrency as Currency)
          : currency;

        const balStr = getCol(row, 'balance');
        const balance = balStr ? parseAmount(balStr) : undefined;

        return { date, description, amount, direction, currency: txCurrency, balance, rawLine: row };
      });
  },
};
