const YAHOO_BASE_URLS = [
  'https://query2.finance.yahoo.com',
  'https://query1.finance.yahoo.com',
];

const YAHOO_REQUEST_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

async function requestYahooJson(path, params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  const suffix = searchParams.toString();

  let lastError;
  for (const base of YAHOO_BASE_URLS) {
    const url = `${base}${path}${suffix ? `?${suffix}` : ''}`;
    try {
      const response = await fetch(url, { headers: YAHOO_REQUEST_HEADERS });
      if (!response.ok) {
        lastError = new Error(`Yahoo Finance ${response.status} from ${base}`);
        continue;
      }
      return response.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// Extracts a normalized quote object from v8/chart response
function parseChartResponse(data, requestedSymbol) {
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta ?? {};
  return {
    symbol: meta.symbol ?? requestedSymbol,
    shortName: meta.shortName ?? null,
    longName: meta.longName ?? null,
    currency: meta.currency ?? null,
    exchangeName: meta.exchangeName ?? null,
    regularMarketPrice: meta.regularMarketPrice ?? null,
    regularMarketPreviousClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
    regularMarketChange:
      meta.regularMarketPrice != null && (meta.previousClose ?? meta.chartPreviousClose) != null
        ? meta.regularMarketPrice - (meta.previousClose ?? meta.chartPreviousClose)
        : null,
    regularMarketChangePercent:
      meta.regularMarketPrice != null && (meta.previousClose ?? meta.chartPreviousClose)
        ? ((meta.regularMarketPrice - (meta.previousClose ?? meta.chartPreviousClose)) /
            (meta.previousClose ?? meta.chartPreviousClose)) * 100
        : null,
  };
}

export async function searchYahooQuotes(query, options = {}) {
  const response = await requestYahooJson('/v1/finance/search', {
    q: query,
    quotesCount: options.quotesCount ?? 8,
    newsCount: 0,
  });
  return { quotes: Array.isArray(response?.quotes) ? response.quotes : [] };
}

export async function getYahooQuoteSummary(symbol) {
  const encoded = encodeURIComponent(symbol);
  const data = await requestYahooJson(`/v8/finance/chart/${encoded}`, {
    range: '1d',
    interval: '1d',
    includePrePost: false,
  });

  const parsed = parseChartResponse(data, symbol);
  if (!parsed) throw new Error(`No chart data for ${symbol}`);

  return {
    price: {
      symbol: parsed.symbol,
      longName: parsed.longName,
      shortName: parsed.shortName,
      exchangeName: parsed.exchangeName,
      currency: parsed.currency,
      regularMarketPrice: parsed.regularMarketPrice,
      regularMarketChangePercent: parsed.regularMarketChangePercent != null
        ? parsed.regularMarketChangePercent / 100
        : null,
    },
  };
}

export async function getYahooQuote(symbolOrSymbols) {
  const symbols = Array.isArray(symbolOrSymbols)
    ? [...new Set(symbolOrSymbols.filter(Boolean))]
    : [symbolOrSymbols].filter(Boolean);

  if (!symbols.length) {
    return Array.isArray(symbolOrSymbols) ? [] : null;
  }

  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const encoded = encodeURIComponent(sym);
      const data = await requestYahooJson(`/v8/finance/chart/${encoded}`, {
        range: '1d',
        interval: '1d',
        includePrePost: false,
      });
      return parseChartResponse(data, sym);
    }),
  );

  const quotes = results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);

  return Array.isArray(symbolOrSymbols) ? quotes : (quotes[0] ?? null);
}