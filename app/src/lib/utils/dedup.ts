import { createHash } from 'crypto';

export function transactionFingerprint(
  accountId: number,
  date: string,
  amount: number,
  direction: string,
  description: string
): string {
  const normalized = description
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const input = [
    accountId,
    date,
    amount.toFixed(2),
    direction,
    normalized,
  ].join('|');

  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}
