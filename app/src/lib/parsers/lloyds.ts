import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, parseUKDate, getCol } from './utils';

export const lloydsParser: StatementParser = {
  bankId: Bank.LLOYDS,
  supportedFormats: ['csv'],

  detect(headers: string[]): boolean {
    const lower = headers.map(h => h.toLowerCase().trim());
    return lower.some(h => h.includes('money in')) && lower.some(h => h.includes('money out'));
  },

  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    return csvData
      .filter(row => getCol(row, 'date', 'transaction date'))
      .map(row => {
        const date = parseUKDate(getCol(row, 'date', 'transaction date'));
        const description = getCol(row, 'description', 'transaction description');

        const moneyIn = parseAmount(getCol(row, 'money in', 'money in (£)'));
        const moneyOut = parseAmount(getCol(row, 'money out', 'money out (£)'));

        const direction = moneyIn > 0 ? TransactionDirection.INFLOW : TransactionDirection.OUTFLOW;
        const amount = moneyIn > 0 ? moneyIn : moneyOut;

        const balStr = getCol(row, 'balance', 'balance (£)');
        const balance = balStr ? parseAmount(balStr) : undefined;

        return { date, description, amount, direction, currency, balance, rawLine: row };
      });
  },
};
