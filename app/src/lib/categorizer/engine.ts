import { AutoCategory, TransactionDirection } from '@/types';
import { CATEGORY_RULES } from './rules';

export function categorizeTransaction(
  description: string,
  direction: TransactionDirection
): AutoCategory {
  for (const rule of CATEGORY_RULES) {
    // Skip if rule is direction-specific and doesn't match
    if (rule.direction && rule.direction !== direction) continue;

    for (const pattern of rule.patterns) {
      if (pattern.test(description)) {
        return rule.category;
      }
    }
  }

  return AutoCategory.OTHER;
}

export function categorizeTransactions(
  transactions: Array<{ description: string; direction: TransactionDirection }>
): AutoCategory[] {
  return transactions.map(tx => categorizeTransaction(tx.description, tx.direction));
}
