import { getYahooQuoteSummary, searchYahooQuotes, getYahooQuote } from '../services/yahooFinance.js'
import {
    createStockRecord,
    deleteStockRecord,
    findStockById,
    listStocksByUserId,
    updateStockRecord,
} from '../data/stocks.js';
import { createBlindIndex, decryptValue, encryptValue } from '../utils/security.js';
import { normalizeTicker } from '../utils/normalizers.js';

const ALLOWED_EXCHANGES = new Set([
    "NASDAQ", "NYSE", "São Paulo", "SAO",
    "NasdaqGS", "NasdaqGM", "NasdaqCM", "NYQ", "AMEX",
    "BUE", "Sao Paulo",
]);

function isAllowedExchange(exchDisp) {
    if (!exchDisp) return false;
    return ALLOWED_EXCHANGES.has(exchDisp);
}

async function withRetry(fn, maxAttempts = 2) {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

class StockController {

    static async searchStocks(req, res) {
        const { stock } = req.body;
        if (!stock) {
            return res.status(200).json({ aviso: 'Stock name is required' });
        }
        try {
            const results = await withRetry(async () => {
                return searchYahooQuotes(stock, { quotesCount: 8 });
            });
            const filteredResults = results.quotes.filter((quote) => isAllowedExchange(quote.exchDisp));
            return res.status(200).json(filteredResults);
        } catch (error) {
            console.warn("Aviso: Falha ao buscar dados de ações:", error.message);
            return res.status(200).json({ aviso: "Não foi possível buscar os dados da ação no momento. Tente novamente mais tarde." });
        }
    }

    static async getStockData(req, res) {
        const { stock } = req.body;
        if (!stock) {
            return res.status(200).json({ aviso: 'Stock name is required' });
        }
        try {
            const stockData = await withRetry(() => getYahooQuoteSummary(stock));
            if (!stockData || !stockData.price) {
                return res.status(200).json({ aviso: "Stock not found or data unavailable" });
            }
            const stockInfo = {
                symbol: stockData.price.symbol,
                name: stockData.price.longName || stockData.price.shortName,
                exchange: stockData.price.exchangeName,
                currency: stockData.price.currency,
                currentPrice: stockData.price.regularMarketPrice,
                dayPriceChangePercent: stockData.price.regularMarketChangePercent,
            };
            return res.status(200).json({ stockInfo });
        } catch (error) {
            console.warn("Aviso: Falha ao buscar dados detalhados da ação:", error.message);
            return res.status(200).json({ aviso: "Não foi possível buscar os dados detalhados da ação no momento. Tente novamente mais tarde." });
        }
    }

    static async getStocksList(req, res) {
        const { id } = req.params;
        try {
            const stocks = await withRetry(() => listStocksByUserId(id));
            const decryptedStocks = stocks.map(item => ({
                _id: item._id,
                symbol: decryptValue(item.symbol) ?? item.symbol,
                currency: decryptValue(item.currency) ?? item.currency,
                averagePrice: decryptValue(item.averagePrice) ?? item.averagePrice,
                stocksQuantity: decryptValue(item.stocksQuantity) ?? item.stocksQuantity,
                userId: item.userId,
            }));
            return res.status(200).json(decryptedStocks);
        } catch (error) {
            console.warn("Aviso: Falha ao buscar lista de ações:", error.message);
            return res.status(200).json({ aviso: "Não foi possível buscar a lista de ações no momento. Tente novamente mais tarde." });
        }
    }

    // Batch endpoint: returns stocks list with current prices in one call
    static async getStocksWithPrices(req, res) {
        const { id } = req.params;
        try {
            const stocks = await listStocksByUserId(id);
            const decryptedStocks = stocks.map(item => ({
                _id: item._id,
                symbol: decryptValue(item.symbol) ?? item.symbol,
                currency: decryptValue(item.currency) ?? item.currency,
                averagePrice: decryptValue(item.averagePrice) ?? item.averagePrice,
                stocksQuantity: decryptValue(item.stocksQuantity) ?? item.stocksQuantity,
                userId: item.userId,
            }));

            // Build yahoo symbols, adding .SA for BRL stocks
            const symbolMap = {};
            for (const s of decryptedStocks) {
                if (!s.symbol) continue;
                const upper = s.symbol.toUpperCase().trim();
                const isBRL = s.currency && s.currency.toUpperCase() === 'BRL';
                const isLikelyB3 = /^[A-Z]{4}\d{1,2}$/.test(upper);
                const apiSymbol = (isBRL || isLikelyB3) && !upper.endsWith('.SA')
                    ? `${upper}.SA`
                    : upper;
                symbolMap[s.symbol] = apiSymbol;
            }

            const uniqueApiSymbols = [...new Set(Object.values(symbolMap))];
            let quotesMap = {};
            if (uniqueApiSymbols.length > 0) {
                try {
                    const quotes = await getYahooQuote(uniqueApiSymbols);
                    if (Array.isArray(quotes)) {
                        for (const q of quotes) {
                            if (q?.symbol) quotesMap[q.symbol] = q;
                        }
                    }
                } catch (err) {
                    console.warn("Batch quote failed:", err.message);
                }
            }

            const enriched = decryptedStocks.map(stock => {
                const apiSym = symbolMap[stock.symbol];
                const q = quotesMap[apiSym];
                return {
                    ...stock,
                    currentPrice: q?.regularMarketPrice ?? 0,
                    dayPriceChangePercent: q?.regularMarketChangePercent != null
                        ? q.regularMarketChangePercent / 100
                        : 0,
                };
            });

            return res.status(200).json(enriched);
        } catch (error) {
            console.warn("Aviso: Falha ao buscar lista com preços:", error.message);
            return res.status(200).json({ aviso: "Não foi possível buscar os dados no momento." });
        }
    }

    static async getStockById(req, res) {
        const { id } = req.params;
        if (!id) {
            return res.status(200).json({ aviso: 'ID is required' });
        }
        try {
            const stockData = await withRetry(() => findStockById(id));
            if (!stockData) {
                return res.status(200).json({ aviso: 'Stock not found' });
            }
            return res.status(200).json(stockData);
        } catch (error) {
            console.warn("Aviso: Falha ao buscar ação por ID:", error.message);
            return res.status(200).json({ aviso: "Não foi possível buscar a ação no momento. Tente novamente mais tarde." });
        }
    }

    static async addStock(req, res) {
        const { symbol, currency, averagePrice, stocksQuantity, userId } = req.body;
        if (!symbol) return res.status(200).json({ aviso: 'Symbol is required' });
        if (!currency) return res.status(200).json({ aviso: 'Currency is required' });
        if (!userId) return res.status(200).json({ aviso: 'userId is required in body' });

        try {
            const normalizedSymbol = normalizeTicker(symbol);
            const symbolHash = createBlindIndex(normalizedSymbol);
            const newStock = await createStockRecord({
                symbol: encryptValue(normalizedSymbol),
                symbolHash,
                currency: encryptValue(currency),
                averagePrice: encryptValue(averagePrice),
                stocksQuantity: encryptValue(stocksQuantity),
                userId,
            });
            return res.status(201).json({ msg: 'Stock created successfully', newStock });
        } catch (error) {
            if (error.code === 'STOCK_CONFLICT') {
                return res.status(200).json({ aviso: 'Stock already exists' });
            }
            console.warn("Aviso: Falha ao adicionar ação:", error.message);
            return res.status(200).json({ aviso: "Não foi possível adicionar a ação no momento. Tente novamente mais tarde." });
        }
    }

    static async deleteStock(req, res) {
        const { id } = req.params;
        if (!id) return res.status(200).json({ aviso: 'ID is required' });

        try {
            const stockExists = await findStockById(id);
            if (!stockExists) {
                return res.status(200).json({ aviso: 'Stock not found' });
            }
            await deleteStockRecord(id);
            return res.status(200).json({ msg: 'Stock deleted successfully' });
        } catch (error) {
            console.warn("Aviso: Falha ao deletar ação:", error.message);
            return res.status(200).json({ aviso: "Não foi possível deletar a ação no momento. Tente novamente mais tarde." });
        }
    }

    static async updateStock(req, res) {
        const { id } = req.params;
        const { averagePrice, stocksQuantity } = req.body;
        if (!id) return res.status(200).json({ aviso: 'ID is required' });
        if (averagePrice === undefined || averagePrice === null || averagePrice === "") {
            return res.status(200).json({ aviso: 'Average price is required' });
        }
        if (isNaN(averagePrice)) {
            return res.status(200).json({ aviso: 'Average price must be a number' });
        }
        if (stocksQuantity === undefined || stocksQuantity === null || isNaN(stocksQuantity)) {
            return res.status(200).json({ aviso: 'Stocks quantity must be a number' });
        }

        try {
            const stockExists = await findStockById(id);
            if (!stockExists) {
                return res.status(200).json({ aviso: 'Stock not found' });
            }
            const updatedStock = await updateStockRecord(id, {
                averagePrice: encryptValue(averagePrice),
                stocksQuantity: encryptValue(stocksQuantity),
            });
            return res.status(200).json({ msg: 'Stock updated successfully', updatedStock });
        } catch (error) {
            console.warn("Aviso: Falha ao atualizar ação:", error.message);
            return res.status(200).json({ aviso: "Não foi possível atualizar a ação no momento. Tente novamente mais tarde." });
        }
    }
}

export default StockController