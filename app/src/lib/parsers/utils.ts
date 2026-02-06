export function parseAmount(value: string): number {
  if (!value) return 0;
  // Remove currency symbols, spaces, thousands separators
  const cleaned = value.replace(/[$€£₺\s]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// MM/DD/YYYY -> Date
export function parseUSDate(value: string): Date {
  const parts = value.trim().split('/');
  if (parts.length !== 3) throw new Error(`Invalid US date: ${value}`);
  const [month, day, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

// DD/MM/YYYY -> Date
export function parseUKDate(value: string): Date {
  const parts = value.trim().split('/');
  if (parts.length !== 3) throw new Error(`Invalid UK date: ${value}`);
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

// DD.MM.YYYY -> Date
export function parseTurkishDate(value: string): Date {
  const parts = value.trim().split('.');
  if (parts.length !== 3) throw new Error(`Invalid Turkish date: ${value}`);
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

// ISO or timestamp string -> Date
export function parseISODate(value: string): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error(`Invalid ISO date: ${value}`);
  return d;
}

export function normalizeDescription(desc: string): string {
  return desc
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase();
}

// Find a column value case-insensitively
export function getCol(row: Record<string, string>, ...possibleNames: string[]): string {
  for (const name of possibleNames) {
    const key = Object.keys(row).find(k => k.toLowerCase().trim() === name.toLowerCase());
    if (key && row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}
