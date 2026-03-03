// Currency and number formatting utilities
// formatBRL: formats number to Brazilian Real style using thousands '.' and decimal ','
// Accepts null/undefined gracefully returning '-'

export function formatBRL(value, { prefix = 'R$ ', allowZero = true, abs = false } = {}) {
  if (value === null || value === undefined || (value === 0 && !allowZero)) return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '-';
  const val = abs ? Math.abs(num) : num;
  return prefix + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(value, { minimumFractionDigits = 2, maximumFractionDigits = 2 } = {}) {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '-';
  return num.toLocaleString('pt-BR', { minimumFractionDigits, maximumFractionDigits });
}

// Generic multi-currency formatter (BRL uses pt-BR, USD also forced to pt-BR separators per requirement)
export function formatCurrency(value, currency = 'BRL', { allowZero = true, abs = false } = {}) {
  if (value === null || value === undefined || (value === 0 && !allowZero)) return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '-';
  const val = abs ? Math.abs(num) : num;

  const normalizedCurrency = typeof currency === 'string'
    ? currency.trim().toUpperCase()
    : 'BRL';

  const currencyConfig = {
    USD: { prefix: 'US$ ', locale: 'en-US' },
    BRL: { prefix: 'R$ ', locale: 'pt-BR' }
  };

  const { prefix, locale } = currencyConfig[normalizedCurrency] || {
    prefix: normalizedCurrency ? `${normalizedCurrency} ` : '',
    locale: 'pt-BR'
  };

  return prefix + val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value, { decimals = 2, allowZero = true } = {}) {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || (!allowZero && num === 0)) return '-';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
}
