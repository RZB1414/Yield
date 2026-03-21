import { getYahooQuoteSummary, searchYahooQuotes } from '../services/yahooFinance.js'
import {
    createStockRecord,
    deleteStockRecord,
    findStockById,
    listStocksByUserId,
    updateStockRecord,
} from '../data/stocks.js';
import { createBlindIndex, decryptValue, encryptValue } from '../utils/security.js';
import { normalizeTicker } from '../utils/normalizers.js';

class StockController {

    static async searchStocks(req, res) {
        const { stock } = req.body
        if (!stock) {
            return res.status(200).json({ aviso: 'Stock name is required' });
        }
        let attempt = 0;
        while (attempt < 2) {
            try {
                const results = await searchYahooQuotes(stock, { quotesCount: 5 });
                const filteredResults = results.quotes.filter((quote) => {
                    return (
                        quote.exchDisp === "NASDAQ" ||
                        quote.exchDisp === "NYSE" ||
                        quote.exchDisp === "São Paulo"
                    )
                })
                return res.status(200).json(filteredResults);
            } catch (error) {
                attempt++;
                if (attempt === 2) {
                    console.warn("Aviso: Falha ao buscar dados de ações:", error.message);
                    return res.status(200).json({ aviso: "Não foi possível buscar os dados da ação no momento. Tente novamente mais tarde." });
                }
            }
        }
    }

    static async getStockData(req, res) {
        const { stock } = req.body
        if (!stock) {
            return res.status(200).json({ aviso: 'Stock name is required' });
        }
        let attempt = 0;
        while (attempt < 2) {
            try {
                const stockData = await getYahooQuoteSummary(stock);

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
                }

                return res.status(200).json({ 'stock info: ': stockInfo });
            } catch (error) {
                attempt++;
                if (attempt === 2) {
                    console.warn("Aviso: Falha ao buscar dados detalhados da ação:", error.message);
                    return res.status(200).json({ aviso: "Não foi possível buscar os dados detalhados da ação no momento. Tente novamente mais tarde." });
                }
            }
        }
    }

    static async getStocksList(req, res) {
        const { id } = req.params
        let attempt = 0;
        while (attempt < 2) {
            try {
                const stocks = await listStocksByUserId(id);
                const decryptedStocks = stocks.map(item => {
                    return {
                        _id: item._id,
                        symbol: decryptValue(item.symbol) ?? item.symbol,
                        currency: decryptValue(item.currency) ?? item.currency,
                        averagePrice: decryptValue(item.averagePrice) ?? item.averagePrice,
                        stocksQuantity: decryptValue(item.stocksQuantity) ?? item.stocksQuantity,
                        userId: item.userId
                    };
                });

                return res.status(200).json(decryptedStocks)
            } catch (error) {
                attempt++;
                if (attempt === 2) {
                    console.warn("Aviso: Falha ao buscar lista de ações:", error.message);
                    return res.status(200).json({ aviso: "Não foi possível buscar a lista de ações no momento. Tente novamente mais tarde." });
                }
            }
        }
    }

    static async getStockById(req, res) {
        const { id } = req.params
        if (!id) {
            return res.status(200).json({ aviso: 'ID is required' });
        }
        let attempt = 0;
        while (attempt < 2) {
            try {
                const stockData = await findStockById(id)
                if (!stockData) {
                    return res.status(200).json({ aviso: 'Stock not found' });
                }
                return res.status(200).json(stockData)
            } catch (error) {
                attempt++;
                if (attempt === 2) {
                    console.warn("Aviso: Falha ao buscar ação por ID:", error.message);
                    return res.status(200).json({ aviso: "Não foi possível buscar a ação no momento. Tente novamente mais tarde." });
                }
            }
        }
    }

    static async addStock(req, res) {
        const { symbol, currency, averagePrice, stocksQuantity, userId } = req.body;
        if (!symbol) {
            return res.status(200).json({ aviso: 'Symbol is required' });
        }
        if (!currency) {
            return res.status(200).json({ aviso: 'Currency is required' });
        }
        if (!userId) {
            return res.status(200).json({ aviso: 'userId is required in body' });
        }
        let attempt = 0;
        while (attempt < 2) {
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

                // Histórico de holdings descontinuado
                return res.status(201).json({ msg: 'Stock created successfully', newStock });
            } catch (error) {
                if (error.code === 'STOCK_CONFLICT') {
                    return res.status(200).json({ aviso: 'Stock already exists' });
                }

                attempt++;
                if (attempt === 2) {
                    console.warn("Aviso: Falha ao adicionar ação:", error.message);
                    return res.status(200).json({ aviso: "Não foi possível adicionar a ação no momento. Tente novamente mais tarde." });
                }
            }
        }
    }

    static async deleteStock(req, res) {
        const { id } = req.params
        if (!id) {
            return res.status(200).json({ aviso: 'ID is required' });
        }
        let attempt = 0;
        while (attempt < 2) {
            try {
                const stockExists = await findStockById(id)
                if (!stockExists) {
                    return res.status(200).json({ aviso: 'Stock not found' });
                }
                // Histórico de holdings descontinuado
                await deleteStockRecord(id)
                return res.status(200).json({ msg: 'Stock deleted successfully' });
            } catch (error) {
                attempt++;
                if (attempt === 2) {
                    console.warn("Aviso: Falha ao deletar ação:", error.message);
                    return res.status(200).json({ aviso: "Não foi possível deletar a ação no momento. Tente novamente mais tarde." });
                }
            }
        }
    }

    static async updateStock(req, res) {
        const { id } = req.params
        const { averagePrice, stocksQuantity } = req.body
        if (!id) {
            return res.status(200).json({ aviso: 'ID is required' });
        }
        if (averagePrice === undefined || averagePrice === null || averagePrice === "") {
            return res.status(200).json({ aviso: 'Average price is required' });
        }
        if (isNaN(averagePrice)) {
            return res.status(200).json({ aviso: 'Average price must be a number' });
        }
        if (stocksQuantity === undefined || stocksQuantity === null || isNaN(stocksQuantity)) {
            return res.status(200).json({ aviso: 'Stocks quantity must be a number' });
        }
        let attempt = 0;
        while (attempt < 2) {
            try {
                const stockExists = await findStockById(id)
                if (!stockExists) {
                    return res.status(200).json({ aviso: 'Stock not found' });
                }
                const updatedStock = await updateStockRecord(id, {
                    averagePrice: encryptValue(averagePrice),
                    stocksQuantity: encryptValue(stocksQuantity),
                });
                return res.status(200).json({ msg: 'Stock updated successfully', updatedStock });
            } catch (error) {
                attempt++;
                if (attempt === 2) {
                    console.warn("Aviso: Falha ao atualizar ação:", error.message);
                    return res.status(200).json({ aviso: "Não foi possível atualizar a ação no momento. Tente novamente mais tarde." });
                }
            }
        }
    }
}

export default StockController