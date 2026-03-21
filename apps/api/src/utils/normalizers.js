export function normalizeTicker(value) {
  return String(value || '').trim().toUpperCase();
}

export function normalizeFreeText(value) {
  return String(value || '').trim();
}

export function normalizeMonthIndex(monthIndex) {
  const parsed = Number.parseInt(monthIndex, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createStoredTradingDate(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}