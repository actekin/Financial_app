import { Bank, Currency, TransactionDirection } from '@/types';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // always positive, in major currency units (e.g. dollars, not cents)
  direction: TransactionDirection;
  currency: Currency;
  balance?: number;
  rawLine: Record<string, string>;
}

export interface StatementParser {
  bankId: Bank;
  supportedFormats: string[];
  detect(headers: string[]): boolean;
  parse(csvData: Record<string, string>[], currency: Currency): ParsedTransaction[];
}
