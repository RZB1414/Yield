import React, { useEffect, useMemo, useState } from 'react';
import './Snapshots.css';
import { getSnapshots } from '../../services/snapshots';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { ReferenceLine } from 'recharts';
import { formatPercent, formatNumber, formatCurrency } from '../../utils/format';

const normalizeCurrency = (value) => (value ?? '').trim().toUpperCase();

const parseNumeric = (value) => {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    const sanitized = trimmed
      .replace(/\s+/g, '')
      .replace(/[%]/g, '')
      .replace(/[^0-9.,+\-Ee]/g, '');

    if (!sanitized) return NaN;

    const decimalMatch = sanitized.match(/([.,])\d+$/);
    const decimalSeparator = decimalMatch ? decimalMatch[1] : null;

    let normalized;
    if (decimalSeparator === ',') {
      normalized = sanitized.replace(/\./g, '').replace(/,/g, '.');
    } else if (decimalSeparator === '.') {
      normalized = sanitized.replace(/,/g, '');
    } else {
      normalized = sanitized.replace(/[.,]/g, '');
    }

    if (!normalized || normalized === '+' || normalized === '-' || normalized === '.') {
      return NaN;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const normalizePercentUnits = (value) => {
  const numeric = parseNumeric(value);
  if (!Number.isFinite(numeric)) return NaN;
  if (Math.abs(numeric) <= 1) {
    return numeric * 100;
  }
  return numeric;
};

const normalizePercentDecimal = (value) => {
  const numeric = parseNumeric(value);
  if (!Number.isFinite(numeric)) return NaN;
  if (Math.abs(numeric) > 1) {
    return numeric / 100;
  }
  return numeric;
};

const currencySpecificTotalKeys = {
  USD: [
    'totalValueUSD',
    'total_value_usd',
    'totalValueUsd',
    'total_value_Usd',
    'positionValueUSD',
    'position_value_usd',
    'positionValueUsd',
    'marketValueUSD',
    'market_value_usd',
    'marketValueUsd',
    'portfolioValueUSD',
    'portfolio_value_usd',
    'dailyTotalUSD',
    'daily_total_usd',
    'totalUsd',
    'total_usd',
    'usdTotalValue'
  ],
  BRL: [
    'totalValueBRL',
    'total_value_brl',
    'totalValueBrl',
    'positionValueBRL',
    'position_value_brl',
    'positionValueBrl',
    'marketValueBRL',
    'market_value_brl',
    'marketValueBrl',
    'portfolioValueBRL',
    'portfolio_value_brl',
    'totalBrl',
    'total_brl',
    'brlTotalValue'
  ]
};

const currencySpecificChangeKeys = {
  USD: [
    'dayChangeUSD',
    'day_change_usd',
    'dailyChangeUSD',
    'daily_change_usd',
    'dailyVariationUSD',
    'daily_variation_usd',
    'dailyGainUSD',
    'daily_gain_usd',
    'dayChangeValueUSD',
    'day_change_value_usd'
  ],
  BRL: [
    'dayChangeBRL',
    'day_change_brl',
    'dailyChangeBRL',
    'daily_change_brl',
    'dailyVariationBRL',
    'daily_variation_brl',
    'dailyGainBRL',
    'daily_gain_brl',
    'dayChangeValueBRL',
    'day_change_value_brl'
  ]
};

const deriveTotalValue = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return NaN;

  const currencyCode = normalizeCurrency(snapshot?.currency);

  const genericCandidates = [
    'totalValue',
    'total_value',
    'total',
    'marketValue',
    'market_value',
    'positionValue',
    'position_value',
    'currentValue',
    'current_value',
    'portfolioValue',
    'portfolio_value',
    'totalInvested',
    'total_invested',
    'value',
    'grossValue',
    'netValue'
  ];

  const candidateKeys = [
    ...(currencySpecificTotalKeys[currencyCode] || []),
    ...genericCandidates
  ];

  const seen = new Set();
  for (const key of candidateKeys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const numeric = parseNumeric(snapshot?.[key]);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  const resolveCandidate = (keys) => {
    for (const key of keys) {
      const numeric = parseNumeric(snapshot?.[key]);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    return NaN;
  };

  const quantity = resolveCandidate([
    'quantity',
    'totalQuantity',
    'stocksQuantity',
    'qty',
    'amount',
    'position',
    'shares',
    'totalAmount'
  ]);

  const averagePrice = resolveCandidate([
    'averagePrice',
    'average_price',
    'avgPrice',
    'avg_price',
    'priceAverage',
    'meanPrice',
    'mediumPrice',
    'averageCost',
    'average_cost',
    'costBasis',
    'cost_basis'
  ]);

  const dayChangeValue = resolveCandidate([
    'dayChangeValue',
    'day_change_value',
    'dayChange',
    'day_change',
    'dayChangeAmount',
    'day_change_amount',
    'dailyChangeValue',
    'daily_change_value',
    'dailyVariationValue',
    'daily_variation_value',
    'dailyGain',
    'daily_gain',
    'dailyResult',
    'daily_result',
    'variationValue',
    'variation_value',
    'appreciationValue',
    'appreciation_value'
  ]);

  const dayChangePercentRaw = resolveCandidate([
    'dayChangePercent',
    'day_change_percent',
    'dailyVariationPercent',
    'daily_variation_percent',
    'variationPercent',
    'variation_percent',
    'dailyReturnPercent',
    'daily_return_percent'
  ]);

  if (Number.isFinite(quantity) && Number.isFinite(averagePrice)) {
    const base = quantity * averagePrice;
    if (Number.isFinite(dayChangeValue)) {
      return base + dayChangeValue;
    }
    if (Number.isFinite(dayChangePercentRaw)) {
      const percent = Math.abs(dayChangePercentRaw) > 1 ? dayChangePercentRaw / 100 : dayChangePercentRaw;
      return base + (base * percent);
    }
  }

  const price = parseNumeric(snapshot?.closePrice);
  if (Number.isFinite(price) && Number.isFinite(quantity)) {
    return price * quantity;
  }

  return NaN;
};

const deriveDailyChangeValue = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return NaN;

  const currencyCode = normalizeCurrency(snapshot?.currency);

  const changeKeys = [
    ...(currencySpecificChangeKeys[currencyCode] || []),
    'dayChange',
    'day_change',
    'dayChangeValue',
    'day_change_value',
    'dayChangeAmount',
    'day_change_amount',
    'dailyChangeValue',
    'daily_change_value',
    'dailyVariationValue',
    'daily_variation_value',
    'dailyGain',
    'daily_gain',
    'dailyResult',
    'daily_result',
    'variationValue',
    'variation_value',
    'appreciationValue',
    'appreciation_value'
  ];

  const seen = new Set();
  for (const key of changeKeys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const numeric = parseNumeric(snapshot?.[key]);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  const percentKeys = [
    'dayChangePercent',
    'day_change_percent',
    'dailyVariationPercent',
    'daily_variation_percent',
    'variationPercent',
    'variation_percent',
    'dailyReturnPercent',
    'daily_return_percent'
  ];

  const baseKeys = [
    ...(currencySpecificTotalKeys[currencyCode] || []),
    'positionValue',
    'position_value',
    'totalValue',
    'total_value',
    'marketValue',
    'market_value',
    'currentValue',
    'current_value',
    'portfolioValue',
    'portfolio_value'
  ];

  const percent = percentKeys
    .map((key) => parseNumeric(snapshot?.[key]))
    .find((value) => Number.isFinite(value));

  if (Number.isFinite(percent)) {
    const baseCandidate = baseKeys
      .map((key) => parseNumeric(snapshot?.[key]))
      .find((value) => Number.isFinite(value));
    if (Number.isFinite(baseCandidate)) {
      const normalizedPercent = Math.abs(percent) > 1 ? percent / 100 : percent;
      return baseCandidate * normalizedPercent;
    }
  }

  const quantity = parseNumeric(snapshot?.quantity ?? snapshot?.stocksQuantity ?? snapshot?.totalQuantity);
  const priceChange = parseNumeric(snapshot?.priceChange ?? snapshot?.dayPriceChange);
  if (Number.isFinite(quantity) && Number.isFinite(priceChange)) {
    return quantity * priceChange;
  }

  return NaN;
};

const currencyColorMap = {
  BRL: 'var(--chart-quantity-line)',
  USD: 'var(--chart-price-line)'
};

const fallbackLineColors = [
  '#ffd166',
  '#06d6a0',
  '#118ab2',
  '#ef476f',
  '#8338ec'
];

const CurrencyMode = {
  ALL: 'ALL',
  BRL: 'BRL',
  USD: 'USD'
};

/**
 * Snapshots chart
 * - Fetches /auth/snapshots and allows selecting a symbol to plot closePrice and dayChangePercent over time
 */
export default function Snapshots({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [symbol, setSymbol] = useState('ALL');
  const [currency, setCurrency] = useState(CurrencyMode.ALL);
  const [range, setRange] = useState('YTD');
  const [clickedPoint, setClickedPoint] = useState(null);
  const [tooltipEnabled, setTooltipEnabled] = useState(false);

  const availableCurrencies = useMemo(() => {
    const set = new Set();
    for (const item of items) {
      const normalized = normalizeCurrency(item?.currency);
      if (normalized && normalized !== 'ALL') {
        set.add(normalized);
      }
    }
    return Array.from(set).sort();
  }, [items]);

  useEffect(() => {
    async function load() {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const params = { userId };
        if (range === 'ALL') {
          params.all = true;
        } else {
          const now = new Date();
          if (range === '30d') {
            now.setDate(now.getDate() - 30);
          } else if (range === '90d') {
            now.setDate(now.getDate() - 90);
          } else if (range === '1y') {
            now.setFullYear(now.getFullYear() - 1);
          } else if (range === 'YTD') {
            now.setMonth(0, 1);
          }
          params.from = now.toISOString().split('T')[0];
        }

        const data = await getSnapshots(params);
        const list = Array.isArray(data?.items) ? data.items : [];
        // ensure tradingDate is Date
        const normalized = list.map((d) => ({
          ...d,
          tradingDate: d.tradingDate ? new Date(d.tradingDate) : null
        }));
        setItems(normalized);
        // default selection: ALL aggregated
        if (symbol === '' && currency === CurrencyMode.BRL) {
          setSymbol('ALL');
        }
      } catch (e) {
        setError('Erro ao carregar snapshots');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, range]);


  const symbols = useMemo(() => {
    if (currency === CurrencyMode.ALL) {
      return [];
    }
    const normalizedCurrency = normalizeCurrency(currency);
    const filtered = items.filter((d) => normalizeCurrency(d.currency) === normalizedCurrency);
    return Array.from(new Set(filtered.map((d) => d.symbol).filter(Boolean))).sort();
  }, [items, currency]);

  const symbolsWithAll = useMemo(() => ['ALL', ...symbols], [symbols]);

  const chartData = useMemo(() => {
    if (!symbol) return [];

    const ensureIsoDate = (date) => {
      if (!date) return null;
      if (date instanceof Date) {
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 10);
      }
      const parsed = new Date(date);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
    };

    if (currency === CurrencyMode.ALL) {
      const currencyKeys = availableCurrencies;
      if (currencyKeys.length === 0) {
        return [];
      }

      const byDate = new Map();
      for (const snapshot of items) {
        const date = ensureIsoDate(snapshot?.tradingDate);
        if (!date) continue;

        const currencyKey = normalizeCurrency(snapshot?.currency);
        if (!currencyKey) continue;

        const totalValue = deriveTotalValue(snapshot);
        const dailyChange = deriveDailyChangeValue(snapshot);

        const entry = byDate.get(date) || new Map();
        const stats = entry.get(currencyKey) || {
          totalValueSum: 0,
          hasTotal: false,
          dailyChangeSum: 0,
          hasDailyChange: false,
          percentSum: 0,
          percentCount: 0
        };

        if (Number.isFinite(totalValue)) {
          stats.totalValueSum += totalValue;
          stats.hasTotal = true;
        }

        if (Number.isFinite(dailyChange)) {
          stats.dailyChangeSum += dailyChange;
          stats.hasDailyChange = true;
        }

        const pctDecimal = normalizePercentDecimal(snapshot?.dayChangePercent);
        if (Number.isFinite(pctDecimal)) {
          stats.percentSum += pctDecimal;
          stats.percentCount += 1;
        }

        entry.set(currencyKey, stats);
        byDate.set(date, entry);
      }

      const sortedBase = Array.from(byDate.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([date, currencyMap]) => {
          const base = { date, totalValue: null };
          currencyKeys.forEach((currencyKey) => {
            const stats = currencyMap.get(currencyKey);
            if (!stats) {
              base[`dayChangePercent_${currencyKey}`] = null;
              return;
            }

            const { totalValueSum, hasTotal, dailyChangeSum, hasDailyChange, percentSum, percentCount } = stats;

            if (hasTotal) {
              base[`totalValue_${currencyKey}`] = totalValueSum;
            }

            if (hasTotal && hasDailyChange) {
              const previousValue = totalValueSum - dailyChangeSum;
              if (!approxEq(previousValue, 0)) {
                base[`dayChangePercent_${currencyKey}`] = (dailyChangeSum / previousValue) * 100;
                return;
              }
            }
            const avgPercent = percentCount > 0 ? (percentSum / percentCount) * 100 : null;
            base[`dayChangePercent_${currencyKey}`] = Number.isFinite(avgPercent) ? avgPercent : null;
          });
          return base;
        });

      // Calculate cumulative using simple growth relative to the first valid total value
      const initialValues = {};

      // Find initial values
      for (const row of sortedBase) {
        let allFound = true;
        for (const c of currencyKeys) {
          if (initialValues[c] === undefined) {
            const val = row[`totalValue_${c}`];
            if (Number.isFinite(val)) {
              initialValues[c] = val;
            }
          }
          if (initialValues[c] === undefined) {
            allFound = false;
          }
        }
        if (allFound) break;
      }

      return sortedBase.map(row => {
        const newRow = { ...row };
        currencyKeys.forEach(c => {
          const currentTotal = row[`totalValue_${c}`];
          const initial = initialValues[c];

          if (Number.isFinite(currentTotal) && Number.isFinite(initial) && !approxEq(initial, 0)) {
            newRow[`accumulatedPercent_${c}`] = ((currentTotal - initial) / initial) * 100;
          } else {
            // Fallback for cases where total value might be missing but we have percent data?
            // Or just null if we can't calculate growth
            newRow[`accumulatedPercent_${c}`] = null;
          }
        });
        return newRow;
      });
    }

    const normalizedCurrency = normalizeCurrency(currency);
    if (symbol === 'ALL') {
      const byDate = new Map();
      for (const snapshot of items) {
        if (normalizeCurrency(snapshot?.currency) !== normalizedCurrency) continue;
        const date = ensureIsoDate(snapshot?.tradingDate);
        if (!date) continue;
        const pctDecimal = normalizePercentDecimal(snapshot?.dayChangePercent);
        const totalValue = deriveTotalValue(snapshot);
        const dayChange = deriveDailyChangeValue(snapshot);
        const prev = byDate.get(date) || {
          sumDecimal: 0,
          count: 0,
          totalValueSum: 0,
          hasTotal: false,
          dailyChangeSum: 0,
          hasDailyChange: false
        };
        if (Number.isFinite(pctDecimal)) {
          prev.sumDecimal += pctDecimal;
          prev.count += 1;
        }
        if (Number.isFinite(totalValue)) {
          prev.totalValueSum += totalValue;
          prev.hasTotal = true;
        }
        if (Number.isFinite(dayChange)) {
          prev.dailyChangeSum += dayChange;
          prev.hasDailyChange = true;
        }
        byDate.set(date, prev);
      }

      const rows = Array.from(byDate.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([date, { sumDecimal = 0, count, totalValueSum, hasTotal, dailyChangeSum, hasDailyChange }]) => {
          const avgDecimal = count > 0 ? sumDecimal / count : null;
          return {
            date,
            closePrice: null,
            dayChangePercentOriginal: Number.isFinite(avgDecimal) ? avgDecimal * 100 : null,
            dayChangePercentDecimal: Number.isFinite(avgDecimal) ? avgDecimal : null,
            totalValueAbsolute: hasTotal ? totalValueSum : null,
            dailyChangeFallback: hasDailyChange ? dailyChangeSum : null,
            currency: normalizedCurrency
          };
        });

      let prevAbsolute = null;
      let runningCumulative = 1.0;

      return rows.map((row) => {
        let absolute = Number.isFinite(row.totalValueAbsolute) ? row.totalValueAbsolute : null;
        if (!Number.isFinite(absolute) && Number.isFinite(prevAbsolute) && Number.isFinite(row.dailyChangeFallback)) {
          absolute = prevAbsolute + row.dailyChangeFallback;
        }

        let dailyChange = null;
        if (Number.isFinite(absolute) && Number.isFinite(prevAbsolute)) {
          dailyChange = absolute - prevAbsolute;
        }
        if (!Number.isFinite(dailyChange) && Number.isFinite(row.dailyChangeFallback)) {
          dailyChange = row.dailyChangeFallback;
        }
        if (!Number.isFinite(dailyChange) && Number.isFinite(row.dayChangePercentDecimal) && Number.isFinite(prevAbsolute)) {
          dailyChange = prevAbsolute * row.dayChangePercentDecimal;
        }

        let percent = null;
        const baseForPercent = Number.isFinite(prevAbsolute)
          ? prevAbsolute
          : (Number.isFinite(absolute) && Number.isFinite(dailyChange) ? absolute - dailyChange : null);
        if (Number.isFinite(dailyChange) && Number.isFinite(baseForPercent) && !approxEq(baseForPercent, 0)) {
          percent = (dailyChange / baseForPercent) * 100;
        } else if (Number.isFinite(row.dayChangePercentOriginal)) {
          percent = row.dayChangePercentOriginal;
        }

        if (Number.isFinite(absolute)) {
          prevAbsolute = absolute;
        } else if (Number.isFinite(prevAbsolute) && Number.isFinite(dailyChange)) {
          const inferred = prevAbsolute + dailyChange;
          if (Number.isFinite(inferred)) {
            prevAbsolute = inferred;
            absolute = inferred;
          }
        }

        // Cumulative calculation
        if (Number.isFinite(percent)) {
          runningCumulative = runningCumulative * (1 + percent / 100);
        }

        return {
          date: row.date,
          closePrice: row.closePrice,
          dayChangePercent: Number.isFinite(percent)
            ? percent
            : (Number.isFinite(row.dayChangePercentOriginal) ? row.dayChangePercentOriginal : null),
          accumulatedPercent: (runningCumulative - 1) * 100,
          totalValue: Number.isFinite(absolute) ? absolute : null,
          dailyChange: Number.isFinite(dailyChange) ? dailyChange : null,
          currency: row.currency
        };
      });
    }

    // Specific symbol
    const rows = items
      .filter((snapshot) => {
        if (!snapshot?.tradingDate) return false;
        return normalizeCurrency(snapshot?.currency) === normalizedCurrency && snapshot.symbol === symbol;
      })
      .sort((a, b) => a.tradingDate - b.tradingDate)
      .map((snapshot) => {
        const absoluteTotal = (() => {
          const value = deriveTotalValue(snapshot);
          return Number.isFinite(value) ? value : null;
        })();
        const dailyChange = (() => {
          const value = deriveDailyChangeValue(snapshot);
          return Number.isFinite(value) ? value : null;
        })();
        return {
          date: ensureIsoDate(snapshot.tradingDate),
          closePrice: (() => {
            const value = parseNumeric(snapshot?.closePrice);
            return Number.isFinite(value) ? value : null;
          })(),
          dayChangePercentOriginal: (() => {
            const value = normalizePercentUnits(snapshot?.dayChangePercent);
            return Number.isFinite(value) ? value : null;
          })(),
          dayChangePercentDecimal: (() => {
            const value = normalizePercentDecimal(snapshot?.dayChangePercent);
            return Number.isFinite(value) ? value : null;
          })(),
          currency: snapshot.currency,
          totalValueAbsolute: absoluteTotal,
          dailyChangeFallback: dailyChange
        };
      });

    let prevAbsolute = null;
    let prevClosePrice = null;
    let runningCumulative = 1.0;

    return rows.map((row) => {
      let absolute = Number.isFinite(row.totalValueAbsolute) ? row.totalValueAbsolute : null;
      if (!Number.isFinite(absolute) && Number.isFinite(prevAbsolute) && Number.isFinite(row.dailyChangeFallback)) {
        absolute = prevAbsolute + row.dailyChangeFallback;
      }

      let dailyChange = null;
      if (Number.isFinite(absolute) && Number.isFinite(prevAbsolute)) {
        dailyChange = absolute - prevAbsolute;
      }
      if (!Number.isFinite(dailyChange) && Number.isFinite(row.dailyChangeFallback)) {
        dailyChange = row.dailyChangeFallback;
      }
      if (!Number.isFinite(dailyChange) && Number.isFinite(row.dayChangePercentDecimal) && Number.isFinite(prevAbsolute)) {
        dailyChange = prevAbsolute * row.dayChangePercentDecimal;
      }

      let percent = null;
      const baseForPercent = Number.isFinite(prevAbsolute)
        ? prevAbsolute
        : (Number.isFinite(absolute) && Number.isFinite(dailyChange) ? absolute - dailyChange : null);
      if (Number.isFinite(dailyChange) && Number.isFinite(baseForPercent) && !approxEq(baseForPercent, 0)) {
        percent = (dailyChange / baseForPercent) * 100;
      } else if (Number.isFinite(row.dayChangePercentOriginal)) {
        percent = row.dayChangePercentOriginal;
      }

      const pricePercent = (Number.isFinite(row.closePrice) && Number.isFinite(prevClosePrice) && !approxEq(prevClosePrice, 0))
        ? ((row.closePrice - prevClosePrice) / prevClosePrice) * 100
        : null;

      if (Number.isFinite(pricePercent)) {
        if (!Number.isFinite(percent) || Math.abs(pricePercent - percent) > 0.2) {
          percent = pricePercent;
        }
      }

      if (Number.isFinite(absolute)) {
        prevAbsolute = absolute;
      } else if (Number.isFinite(prevAbsolute) && Number.isFinite(dailyChange)) {
        const inferred = prevAbsolute + dailyChange;
        if (Number.isFinite(inferred)) {
          prevAbsolute = inferred;
          absolute = inferred;
        }
      }

      if (Number.isFinite(row.closePrice)) {
        prevClosePrice = row.closePrice;
      }

      // Cumulative calculation based on TWR (Time Weighted Return)
      if (Number.isFinite(percent)) {
        runningCumulative = runningCumulative * (1 + percent / 100);
      }

      return {
        date: row.date,
        closePrice: row.closePrice,
        dayChangePercent: Number.isFinite(percent)
          ? percent
          : (Number.isFinite(row.dayChangePercentOriginal) ? row.dayChangePercentOriginal : null),
        accumulatedPercent: (runningCumulative - 1) * 100,
        currency: row.currency,
        totalValue: Number.isFinite(absolute) ? absolute : null,
        dailyChange: Number.isFinite(dailyChange) ? dailyChange : null
      };
    });
  }, [items, symbol, currency, availableCurrencies]);

  const hasRenderablePoints = useMemo(() => {
    for (const row of chartData) {
      if (!row || typeof row !== 'object') continue;
      for (const [key, rawValue] of Object.entries(row)) {
        if (key === 'closePrice' || key === 'accumulatedPercent' || key.startsWith('accumulatedPercent_')) {
          const value = Number(rawValue);
          if (Number.isFinite(value)) {
            return true;
          }
        }
      }
    }
    return false;
  }, [chartData]);

  const shouldShowChart = hasRenderablePoints;

  // Utility: compare floating numbers with tolerance
  function approxEq(a, b, eps = 1e-6) {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < eps;
  }

  const percentSeriesKeys = useMemo(() => {
    if (currency === 'ALL') {
      return availableCurrencies.map((code) => `accumulatedPercent_${code}`);
    }
    return ['accumulatedPercent'];
  }, [currency, availableCurrencies]);

  const percentSeriesValues = useMemo(() => {
    const values = [];
    for (const row of chartData) {
      for (const key of percentSeriesKeys) {
        const value = Number(row?.[key]);
        if (Number.isFinite(value)) {
          values.push(value);
        }
      }
    }
    return values;
  }, [chartData, percentSeriesKeys]);

  // Determine min/max for right axis (percent)
  const rightMinMax = useMemo(() => {
    if (percentSeriesValues.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...percentSeriesValues),
      max: Math.max(...percentSeriesValues)
    };
  }, [percentSeriesValues]);
  const yRightDomain = useMemo(() => {
    // Exact domain logic used for the ticks calculation
    let minBound = Math.min(rightMinMax.min, 0);
    let maxBound = Math.max(rightMinMax.max, 0);

    if (approxEq(maxBound, minBound)) {
      maxBound = minBound + 10; // ensure visual span if flat
    }
    return [minBound, maxBound];
  }, [rightMinMax]);

  const leftMinMax = useMemo(() => {
    if (symbol === 'ALL') return { min: 0, max: 0 };
    const vals = chartData.map(d => Number(d.closePrice)).filter(Number.isFinite);
    if (vals.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [chartData, symbol]);
  const yLeftDomain = useMemo(() => {
    if (symbol === 'ALL') return undefined;
    const pad = 1;
    let minBound = leftMinMax.min - pad;
    let maxBound = leftMinMax.max + pad;
    if (approxEq(maxBound, minBound)) {
      maxBound = minBound + 2 * pad;
    }
    return [minBound, maxBound];
  }, [leftMinMax, symbol]);

  // Build ticks: show [min, 0, max] and intermediate
  const uniqueSorted = (arr) => Array.from(new Set(arr.filter((v) => Number.isFinite(v)))).sort((a, b) => a - b);

  const rightTicks = useMemo(() => {
    if (chartData.length === 0) return [0];

    const min = rightMinMax.min;
    // Start with 0 and min
    const ticks = [0, min];

    // Add last values
    const lastRow = chartData[chartData.length - 1];
    if (lastRow) {
      for (const key of percentSeriesKeys) {
        const val = Number(lastRow[key]);
        if (Number.isFinite(val)) {
          ticks.push(val);
        }
      }
    }

    return uniqueSorted(ticks);
  }, [rightMinMax, chartData, percentSeriesKeys]);

  const leftTicks = useMemo(() => {
    if (symbol === 'ALL') return undefined;
    const vals = chartData.map((d) => Number(d.closePrice)).filter(Number.isFinite);
    if (vals.length === 0) return undefined;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    // Include 0 only if the data crosses zero; otherwise just [min, max]
    if (min < 0 && max > 0) {
      return uniqueSorted([min, 0, max]);
    }
    return uniqueSorted([min, max]);
  }, [chartData, symbol]);

  // Reset selection when currency, symbol, or range changes
  useEffect(() => {
    setClickedPoint(null);
    setTooltipEnabled(false);
  }, [currency, symbol, range]);

  // Keep the specific logic for resetting symbol when currency changes
  useEffect(() => {
    setSymbol('ALL');
  }, [currency]);

  const activeCurrencyLabels = useMemo(() => (
    currency === CurrencyMode.ALL ? availableCurrencies : [currency]
  ), [currency, availableCurrencies]);

  // Custom Y-axis ticks with color: white for >= 0, red for < 0

  const LeftAxisTick = React.useCallback((props) => {
    const { x, y, payload } = props;
    const v = Number(payload?.value);
    const color = Number.isFinite(v) && v < 0 ? '#ff4d4f' : '#ffffff';
    const isMin = approxEq(v, leftMinMax.min);
    const isMax = approxEq(v, leftMinMax.max);
    const dy = isMax ? 8 : isMin ? -2 : 4;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={dy} dx={-4} textAnchor="end" fill={color}>
          {Number.isFinite(v) ? formatNumber(v) : payload?.value}
        </text>
      </g>
    );
  }, [leftMinMax]);

  const RightAxisTick = React.useCallback((props) => {
    const { x, y, payload } = props;
    const v = Number(payload?.value);
    const color = Number.isFinite(v) && v < 0 ? '#ff4d4f' : '#ffffff';
    const isMin = approxEq(v, rightMinMax.min);
    const isMax = approxEq(v, rightMinMax.max);
    const dy = isMax ? 8 : isMin ? -2 : 4;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={dy} dx={4} textAnchor="start" fill={color}>
          {formatPercent(v)}
        </text>
      </g>
    );
  }, [rightMinMax]);

  return (
    <div className="snapshots-wrapper">
      <div className="snapshots-header">
        <h3>Total Gain</h3>
        <div className="snapshots-controls">
          <label>
            Currency:
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value={CurrencyMode.ALL}>ALL</option>
              <option value={CurrencyMode.BRL}>BRL</option>
              <option value={CurrencyMode.USD}>USD</option>
            </select>
          </label>
          <label style={{ marginLeft: 8 }}>
            Stock:
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {symbolsWithAll.map((s) => (
                <option key={s} value={s}>
                  {s.replace('.SA', '')}
                </option>
              ))}
            </select>
          </label>
          <label >
            Período:
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
              <option value="YTD">YTD</option>
              <option value="1y">1 Year</option>
              <option value="ALL">All</option>
            </select>
          </label>
        </div>
      </div>

      {loading && <div className="snap-status">Carregando...</div>}
      {error && <div className="snap-error">{error}</div>}
      {clickedPoint && (
        <div className="snap-status">
          {(() => {
            const date = typeof clickedPoint.date === 'string' && clickedPoint.date.length >= 10
              ? `${clickedPoint.date.slice(8, 10)}/${clickedPoint.date.slice(5, 7)}`
              : clickedPoint.date;

            const payload = clickedPoint.payload || {};

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold' }}>{date}</div>

                {/* 1. Percent Values (Accumulated) */}
                {activeCurrencyLabels.map(code => {
                  const key = currency === CurrencyMode.ALL ? `accumulatedPercent_${code}` : 'accumulatedPercent';
                  const val = currency === CurrencyMode.ALL ? payload[key] : payload.accumulatedPercent;

                  if (!Number.isFinite(val)) return null;

                  const color = currency === CurrencyMode.ALL
                    ? (currencyColorMap[code] || '#ffffff')
                    : 'var(--chart-quantity-line)';

                  return (
                    <div key={`pct-${code}`} style={{ color, fontWeight: 600 }}>
                      {currency === CurrencyMode.ALL ? `Acumulado % (${code})` : 'Acumulado %'}: {formatPercent(val)}
                    </div>
                  );
                })}

                {/* 2. Total Values (BRL / USD) */}
                <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {activeCurrencyLabels.map(code => {
                    let val = null;
                    if (currency === CurrencyMode.ALL) {
                      val = payload[`totalValue_${code}`];
                    } else {
                      if (code === currency) {
                        val = payload.totalValueAbsolute ?? payload.totalValue;
                      }
                    }

                    if (!Number.isFinite(val)) return null;
                    return (
                      <div key={`tot-${code}`} style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        Valor Total ({code}): {formatCurrency(val, code)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {!loading && !error && !shouldShowChart && (
        <div className="snap-status">Sem dados</div>
      )}

      {shouldShowChart && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={chartData}
              margin={{ top: 28, right: 30, left: 10, bottom: 28 }}
              onMouseDown={(e) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  setTooltipEnabled(true);
                }
              }}
              onMouseLeave={() => {
                setTooltipEnabled(false);
              }}
              onMouseUp={() => {
                setTooltipEnabled(false);
              }}
              onClick={(e) => {
                if (e && Array.isArray(e.activePayload) && e.activePayload.length > 0) {
                  const firstPayload = e.activePayload[0]?.payload;
                  setClickedPoint({
                    date: e.activeLabel ?? firstPayload?.date,
                    payload: firstPayload,
                    currency
                  });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  typeof v === 'string' && v.length >= 10
                    ? `${v.slice(8, 10)}/${v.slice(5, 7)}`
                    : v
                }
              />
              <YAxis yAxisId="left" orientation="left" stroke="var(--chart-price-line)" domain={yLeftDomain} ticks={leftTicks} tick={<LeftAxisTick />} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--chart-quantity-line)"
                domain={yRightDomain}
                ticks={rightTicks}
                tick={<RightAxisTick />}
              />
              <Tooltip
                wrapperStyle={{ marginTop: -84 }}
                content={({ label, payload }) => {
                  if (!tooltipEnabled) return null;
                  if (!payload || payload.length === 0) return null;
                  const dateLabel = typeof label === 'string' && label.length >= 10
                    ? `${label.slice(8, 10)}/${label.slice(5, 7)}`
                    : label;
                  const payloadCurrency = normalizeCurrency(payload?.[0]?.payload?.currency);
                  const effectiveCurrency = (payloadCurrency && payloadCurrency !== 'ALL')
                    ? payloadCurrency
                    : normalizeCurrency(currency);
                  const items = payload
                    .map((item, index) => {
                      const value = Number(item?.value);
                      if (!Number.isFinite(value)) return null;
                      const dataKey = item?.dataKey || item?.name || `series-${index}`;
                      return {
                        key: dataKey,
                        label: item?.name || item?.dataKey,
                        value,
                        color: item?.color,
                        isPercentSeries: typeof item?.dataKey === 'string' && item.dataKey.startsWith('accumulatedPercent')
                      };
                    })
                    .filter(Boolean);
                  if (items.length === 0) return null;

                  const dailyChangeFromPayload = Number(payload?.[0]?.payload?.dailyChange);
                  const dailyChangeValue = Number.isFinite(dailyChangeFromPayload)
                    ? dailyChangeFromPayload
                    : deriveDailyChangeValue(payload?.[0]?.payload);
                  return (
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{dateLabel}</div>
                      {items.map((item) => {
                        const color = item.value < 0 ? '#ff4d4f' : item.color || '#ffffff';
                        const display = item.isPercentSeries
                          ? formatPercent(item.value)
                          : formatCurrency(item.value, effectiveCurrency);
                        return (
                          <div key={item.key} style={{ fontWeight: 600, color }}>
                            {item.label}: {display}
                          </div>
                        );
                      })}

                      {/* Daily Variation Percent */}
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {activeCurrencyLabels.map((code) => {
                          const key = currency === CurrencyMode.ALL ? `dayChangePercent_${code}` : 'dayChangePercent';
                          const val = Number(payload[0]?.payload?.[key]);
                          if (!Number.isFinite(val)) return null;
                          const color = val < 0 ? '#ff4d4f' : '#06d6a0';
                          return (
                            <div key={code} style={{ color, fontSize: 12 }}>
                              Dia ({code}): {formatPercent(val)}
                            </div>
                          );
                        })}
                      </div>

                      {/* Total Values (BRL / USD) */}
                      <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {activeCurrencyLabels.map(code => {
                          let val = null;
                          const payloadData = payload[0]?.payload;
                          if (currency === CurrencyMode.ALL) {
                            val = payloadData[`totalValue_${code}`];
                          } else {
                            if (code === currency) {
                              val = payloadData.totalValueAbsolute ?? payloadData.totalValue;
                            }
                          }

                          if (!Number.isFinite(val)) return null;
                          return (
                            <div key={`tot-${code}`} style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                              Valor Total ({code}): {formatCurrency(val, code)}
                            </div>
                          );
                        })}
                      </div>
                      {currency !== CurrencyMode.ALL && Number.isFinite(dailyChangeValue) && (
                        <div style={{ fontSize: 12, color: dailyChangeValue < 0 ? '#ff4d4f' : '#06d6a0' }}>
                          Variação diária: {formatCurrency(dailyChangeValue, effectiveCurrency)}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Legend />
              <ReferenceLine y={0} yAxisId="right" stroke="var(--color-border)" />
              {symbol !== 'ALL' && leftMinMax.min < 0 && leftMinMax.max > 0 && (
                <ReferenceLine y={0} yAxisId="left" stroke="var(--color-border)" />
              )}
              {(currency === CurrencyMode.BRL || currency === CurrencyMode.USD) && symbol !== 'ALL' && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="closePrice"
                  stroke="var(--chart-price-line)"
                  name={`Preço (${currency})`}
                  dot={chartData.length <= 1}
                  connectNulls
                />
              )}
              {currency === CurrencyMode.ALL
                ? availableCurrencies.map((code, index) => {
                  const dataKey = `accumulatedPercent_${code}`;
                  const stroke = currencyColorMap[code] || fallbackLineColors[index % fallbackLineColors.length];
                  return (
                    <Line
                      key={dataKey}
                      yAxisId="right"
                      type="monotone"
                      dataKey={dataKey}
                      stroke={stroke}
                      name={`Acumulado % (${code})`}
                      dot={chartData.length <= 1}
                      connectNulls
                    />
                  );
                })
                : (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="accumulatedPercent"
                    stroke="var(--chart-quantity-line)"
                    name="Acumulado %"
                    dot={chartData.length <= 1}
                    connectNulls
                  />
                )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
