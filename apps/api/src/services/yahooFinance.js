const YAHOO_API_BASE_URL = 'https://query1.finance.yahoo.com';
const YAHOO_REQUEST_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; PersonalYieldWorker/1.0; +https://workers.dev)',
};

async function requestYahooJson(path, params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const suffix = searchParams.toString();
  const url = `${YAHOO_API_BASE_URL}${path}${suffix ? `?${suffix}` : ''}`;
  const response = await fetch(url, { headers: YAHOO_REQUEST_HEADERS });

  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed with status ${response.status}`);
  }

  return response.json();
}

export async function searchYahooQuotes(query, options = {}) {
  const response = await requestYahooJson('/v1/finance/search', {
    q: query,
    quotesCount: options.quotesCount ?? 5,
    newsCount: 0,
  });

  return {
    quotes: Array.isArray(response?.quotes) ? response.quotes : [],
  };
}

export async function getYahooQuoteSummary(symbol) {
  const response = await requestYahooJson(`/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`, {
    modules: 'price',
    formatted: false,
  });

  if (response?.quoteSummary?.error) {
    throw new Error(response.quoteSummary.error.description || 'Yahoo Finance quoteSummary failed');
  }

  return response?.quoteSummary?.result?.[0] ?? null;
}

export async function getYahooQuote(symbolOrSymbols) {
  const symbols = Array.isArray(symbolOrSymbols)
    ? [...new Set(symbolOrSymbols.filter(Boolean))]
    : [symbolOrSymbols].filter(Boolean);

  if (!symbols.length) {
    return Array.isArray(symbolOrSymbols) ? [] : null;
  }

  const response = await requestYahooJson('/v7/finance/quote', {
    symbols: symbols.join(','),
    formatted: false,
  });

  const quotes = Array.isArray(response?.quoteResponse?.result)
    ? response.quoteResponse.result
    : [];

  return Array.isArray(symbolOrSymbols) ? quotes : (quotes[0] ?? null);
}