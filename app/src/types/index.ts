export enum Bank {
  BANK_OF_AMERICA = 'bank_of_america',
  CHASE = 'chase',
  LLOYDS = 'lloyds',
  HSBC = 'hsbc',
  AMEX = 'amex',
  QNB_FINANSBANK = 'qnb_finansbank',
  REVOLUT = 'revolut',
  TRADING_212 = 'trading_212',
  OTHER = 'other',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  TRY = 'TRY',
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
}

export enum TransactionDirection {
  INFLOW = 'inflow',
  OUTFLOW = 'outflow',
}

export enum AutoCategory {
  SALARY = 'salary',
  FREELANCE_INCOME = 'freelance_income',
  INVESTMENT_RETURN = 'investment_return',
  INTEREST = 'interest',
  TRANSFER_IN = 'transfer_in',
  RENT = 'rent',
  MORTGAGE = 'mortgage',
  UTILITIES = 'utilities',
  SUBSCRIPTIONS = 'subscriptions',
  GROCERIES = 'groceries',
  DINING = 'dining',
  TRANSPORT = 'transport',
  TRAVEL = 'travel',
  HEALTH = 'health',
  INSURANCE = 'insurance',
  SHOPPING = 'shopping',
  FURNITURE = 'furniture',
  ELECTRONICS = 'electronics',
  ENTERTAINMENT = 'entertainment',
  EDUCATION = 'education',
  TAXES = 'taxes',
  FEES = 'fees',
  TRANSFER_OUT = 'transfer_out',
  ATM_WITHDRAWAL = 'atm_withdrawal',
  MARKET_MOVEMENT = 'market_movement',
  OTHER = 'other',
}

export const BANK_LABELS: Record<Bank, string> = {
  [Bank.BANK_OF_AMERICA]: 'Bank of America',
  [Bank.CHASE]: 'Chase',
  [Bank.LLOYDS]: 'Lloyds',
  [Bank.HSBC]: 'HSBC',
  [Bank.AMEX]: 'American Express',
  [Bank.QNB_FINANSBANK]: 'QNB Finansbank',
  [Bank.REVOLUT]: 'Revolut',
  [Bank.TRADING_212]: 'Trading 212',
  [Bank.OTHER]: 'Other',
};

// Get display label for any bank value (predefined or custom)
export function getBankLabel(bank: string): string {
  return BANK_LABELS[bank as Bank] || bank;
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.USD]: '$',
  [Currency.EUR]: '€',
  [Currency.GBP]: '£',
  [Currency.TRY]: '₺',
};

export const CATEGORY_LABELS: Record<AutoCategory, string> = {
  [AutoCategory.SALARY]: 'Salary',
  [AutoCategory.FREELANCE_INCOME]: 'Freelance Income',
  [AutoCategory.INVESTMENT_RETURN]: 'Investment Return',
  [AutoCategory.INTEREST]: 'Interest',
  [AutoCategory.TRANSFER_IN]: 'Transfer In',
  [AutoCategory.RENT]: 'Rent',
  [AutoCategory.MORTGAGE]: 'Mortgage',
  [AutoCategory.UTILITIES]: 'Utilities',
  [AutoCategory.SUBSCRIPTIONS]: 'Subscriptions',
  [AutoCategory.GROCERIES]: 'Groceries',
  [AutoCategory.DINING]: 'Dining',
  [AutoCategory.TRANSPORT]: 'Transport',
  [AutoCategory.TRAVEL]: 'Travel',
  [AutoCategory.HEALTH]: 'Health',
  [AutoCategory.INSURANCE]: 'Insurance',
  [AutoCategory.SHOPPING]: 'Shopping',
  [AutoCategory.FURNITURE]: 'Furniture',
  [AutoCategory.ELECTRONICS]: 'Electronics',
  [AutoCategory.ENTERTAINMENT]: 'Entertainment',
  [AutoCategory.EDUCATION]: 'Education',
  [AutoCategory.TAXES]: 'Taxes',
  [AutoCategory.FEES]: 'Fees',
  [AutoCategory.TRANSFER_OUT]: 'Transfer Out',
  [AutoCategory.ATM_WITHDRAWAL]: 'ATM Withdrawal',
  [AutoCategory.MARKET_MOVEMENT]: 'Market Movement',
  [AutoCategory.OTHER]: 'Other',
};

export const CATEGORY_COLORS: Record<AutoCategory, string> = {
  [AutoCategory.SALARY]: '#22c55e',
  [AutoCategory.FREELANCE_INCOME]: '#16a34a',
  [AutoCategory.INVESTMENT_RETURN]: '#15803d',
  [AutoCategory.INTEREST]: '#86efac',
  [AutoCategory.TRANSFER_IN]: '#a3e635',
  [AutoCategory.RENT]: '#ef4444',
  [AutoCategory.MORTGAGE]: '#dc2626',
  [AutoCategory.UTILITIES]: '#f97316',
  [AutoCategory.SUBSCRIPTIONS]: '#fb923c',
  [AutoCategory.GROCERIES]: '#eab308',
  [AutoCategory.DINING]: '#f59e0b',
  [AutoCategory.TRANSPORT]: '#06b6d4',
  [AutoCategory.TRAVEL]: '#8b5cf6',
  [AutoCategory.HEALTH]: '#ec4899',
  [AutoCategory.INSURANCE]: '#f43f5e',
  [AutoCategory.SHOPPING]: '#a855f7',
  [AutoCategory.FURNITURE]: '#d946ef',
  [AutoCategory.ELECTRONICS]: '#6366f1',
  [AutoCategory.ENTERTAINMENT]: '#14b8a6',
  [AutoCategory.EDUCATION]: '#0ea5e9',
  [AutoCategory.TAXES]: '#64748b',
  [AutoCategory.FEES]: '#94a3b8',
  [AutoCategory.TRANSFER_OUT]: '#78716c',
  [AutoCategory.ATM_WITHDRAWAL]: '#a8a29e',
  [AutoCategory.MARKET_MOVEMENT]: '#10b981',
  [AutoCategory.OTHER]: '#9ca3af',
};

export interface Account {
  id: number;
  bank: string;
  name: string;
  type: AccountType;
  currency: Currency;
  isActive: boolean;
  groupName: string | null;
  createdAt: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  date: string;
  originalAmount: number;
  originalCurrency: Currency;
  convertedAmount: number | null;
  convertedCurrency: Currency | null;
  description: string;
  rawDescription: string;
  direction: TransactionDirection;
  autoCategory: AutoCategory;
  strandId: number | null;
  isRecurring: boolean;
  isTransfer: boolean;
  excludeFromFlow: boolean;
  createdAt: string;
}

export interface Snapshot {
  id: number;
  accountId: number;
  date: string;
  balance: number;
  currency: Currency;
  source: 'manual' | 'computed';
}

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  direction: TransactionDirection;
  currency: Currency;
  balance?: number;
  rawLine: Record<string, string>;
}
