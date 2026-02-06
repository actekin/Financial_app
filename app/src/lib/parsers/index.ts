import { Bank } from '@/types';
import { StatementParser } from './types';
import { bankOfAmericaParser } from './bank-of-america';
import { chaseParser } from './chase';
import { lloydsParser } from './lloyds';
import { hsbcParser } from './hsbc';
import { qnbFinansbankParser } from './qnb-finansbank';
import { revolutParser } from './revolut';
import { trading212Parser } from './trading-212';
import { genericParser } from './generic';

const parsers: StatementParser[] = [
  // Order matters for auto-detection: more specific parsers first
  trading212Parser,
  lloydsParser,
  hsbcParser,
  revolutParser,
  bankOfAmericaParser,
  chaseParser,
  qnbFinansbankParser,
  genericParser,
];

const parsersByBank: Record<Bank, StatementParser> = {
  [Bank.BANK_OF_AMERICA]: bankOfAmericaParser,
  [Bank.CHASE]: chaseParser,
  [Bank.LLOYDS]: lloydsParser,
  [Bank.HSBC]: hsbcParser,
  [Bank.QNB_FINANSBANK]: qnbFinansbankParser,
  [Bank.REVOLUT]: revolutParser,
  [Bank.TRADING_212]: trading212Parser,
};

export function detectParser(headers: string[]): StatementParser | null {
  for (const parser of parsers) {
    if (parser.detect(headers)) return parser;
  }
  return null;
}

export function getParserForBank(bank: Bank): StatementParser {
  return parsersByBank[bank] || genericParser;
}

export { genericParser } from './generic';
export type { StatementParser, ParsedTransaction } from './types';
