import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, parseISODate, getCol } from './utils';

export const trading212Parser: StatementParser = {
  bankId: Bank.TRADING_212,
  supportedFormats: ['csv'],

  detect(headers: string[]): boolean {
    const lower = headers.map(h => h.toLowerCase().trim());
    return (
      lower.includes('action') &&
      lower.some(h => h.includes('time')) &&
      lower.some(h => h.includes('isin') || h.includes('ticker'))
    );
  },

  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    return csvData
      .filter(row => getCol(row, 'action', 'time'))
      .map(row => {
        const dateStr = getCol(row, 'time');
        const date = parseISODate(dateStr);
        const action = getCol(row, 'action').toLowerCase();
        const ticker = getCol(row, 'ticker');
        const name = getCol(row, 'name');

        let description: string;
        let amount: number;
        let direction: TransactionDirection;
        let excludeFromFlow = false;

        if (action.includes('deposit')) {
          description = 'Deposit to Trading 212';
          amount = Math.abs(parseAmount(getCol(row, 'total', 'result')));
          direction = TransactionDirection.INFLOW;
        } else if (action.includes('withdrawal')) {
          description = 'Withdrawal from Trading 212';
          amount = Math.abs(parseAmount(getCol(row, 'total', 'result')));
          direction = TransactionDirection.OUTFLOW;
        } else if (action.includes('dividend')) {
          description = `Dividend: ${name || ticker}`;
          amount = Math.abs(parseAmount(getCol(row, 'total', 'result')));
          direction = TransactionDirection.INFLOW;
        } else {
          // Market buy/sell — store but exclude from Sankey flows
          const isBuy = action.includes('buy');
          description = `${isBuy ? 'Buy' : 'Sell'}: ${name || ticker}`;
          amount = Math.abs(parseAmount(getCol(row, 'total', 'result')));
          direction = isBuy ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
          excludeFromFlow = true;
        }

        return {
          date,
          description,
          amount,
          direction,
          currency,
          rawLine: { ...row, _excludeFromFlow: String(excludeFromFlow) },
        };
      });
  },
};
