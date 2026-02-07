import { Bank, Currency, TransactionDirection } from '@/types';
import { StatementParser, ParsedTransaction } from './types';
import { parseAmount, parseTurkishDate, parseUKDate, parseUSDate, getCol } from './utils';

export const qnbFinansbankParser: StatementParser = {
  bankId: Bank.QNB_FINANSBANK,
  supportedFormats: ['csv'],

  detect(headers: string[]): boolean {
    const lower = headers.map(h => h.toLowerCase().trim());
    // QNB doesn't have a well-documented format; detect by Turkish column names
    return (
      lower.some(h => h.includes('tarih') || h.includes('date')) &&
      lower.some(h => h.includes('tutar') || h.includes('amount') || h.includes('açıklama') || h.includes('description'))
    );
  },

  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[] {
    return csvData
      .filter(row => getCol(row, 'tarih', 'date', 'işlem tarihi'))
      .map(row => {
        const dateStr = getCol(row, 'tarih', 'date', 'işlem tarihi');
        let date: Date;
        try {
          date = parseTurkishDate(dateStr); // DD.MM.YYYY
        } catch {
          try {
            date = parseUKDate(dateStr); // DD/MM/YYYY
          } catch {
            date = parseUSDate(dateStr); // MM/DD/YYYY fallback
          }
        }

        const description = getCol(row, 'açıklama', 'description', 'işlem açıklaması');

        const amountStr = getCol(row, 'tutar', 'amount');
        let amount: number;
        let direction: TransactionDirection;

        if (amountStr) {
          // Turkish format may use comma as decimal: 1.234,56
          const normalized = amountStr.replace(/\./g, '').replace(',', '.');
          const val = parseFloat(normalized) || parseAmount(amountStr);
          direction = val < 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
          amount = Math.abs(val);
        } else {
          const debit = parseAmount(getCol(row, 'borç', 'debit', 'çıkış'));
          const credit = parseAmount(getCol(row, 'alacak', 'credit', 'giriş'));
          if (debit > 0) {
            direction = TransactionDirection.OUTFLOW;
            amount = debit;
          } else {
            direction = TransactionDirection.INFLOW;
            amount = credit;
          }
        }

        const balStr = getCol(row, 'bakiye', 'balance');
        const balance = balStr ? parseAmount(balStr) : undefined;

        return { date, description, amount, direction, currency, balance, rawLine: row };
      });
  },
};
