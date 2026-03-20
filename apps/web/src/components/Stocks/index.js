import './Stocks.css';
import { useState, useEffect, useRef } from 'react';
import { formatCurrency, formatPercent } from '../../utils/format';
import { searchStocks, stockData, addStock, updateStock, deleteStock } from '../../services/stocks';
import { stocks, updated, dividends } from '../Connect';
import { ReactComponent as CloseIcon } from '../../assets/icons/close-icon.svg';
import { ReactComponent as AddIcon } from '../../assets/icons/add-circle-icon.svg'
import { ReactComponent as SearchIcon } from '../../assets/icons/search-icon.svg'
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete-icon.svg'
import { ReactComponent as EditIcon } from '../../assets/icons/edit-icon.svg'
import Snapshots from '../Snapshots';

const DEFAULT_COLUMNS = [
    'currentPrice', 'avgPrice', 'dailyReturn', 'stockReturn',
    'returnAndDiv', 'totalValue', 'gain', 'dividends', 'stockQuantity'
]

const COLUMN_CONFIG = {
    currentPrice: { label: 'Current Price', align: 'left' },
    avgPrice: { label: 'Avg Price', align: 'left' },
    dailyReturn: { label: 'Daily Return', align: 'left' },
    stockReturn: { label: 'Stock Return', align: 'left' },
    returnAndDiv: { label: 'Return & Div', align: 'left' },
    totalValue: { label: 'Total Value', align: 'left' },
    gain: { label: 'Gain', align: 'left' },
    dividends: { label: 'Dividends', align: 'left' },
    stockQuantity: { label: 'Stock Quantity', align: 'left' }
}

const Stocks = ({ fetchingAgain, setRefresh }) => {

    const [stock, setStock] = useState('');
    const [results, setResults] = useState([]);
    const [stockClicked, setStockClicked] = useState([]);
    const [showingStock, setShowingStock] = useState(false);
    const [stocksList, setStocksList] = useState([]);
    const [updatedStocksList, setUpdatedStocksList] = useState([])
    const [selectedStock, setSelectedStock] = useState(null)
    const [newAveragePrice, setNewAveragePrice] = useState('')
    const [stocksQuantity, setStocksQuantity] = useState(0)
    const [searchStock, setSearchStock] = useState(false)
    const [dividendsList, setDividendsList] = useState([])
    const [updatingValues, setUpdatingValues] = useState('')

    // Column Reordering State
    const [columnsOrder, setColumnsOrder] = useState(DEFAULT_COLUMNS)
    const [isEditingColumns, setIsEditingColumns] = useState(false)
    const [tempColumnsOrder, setTempColumnsOrder] = useState(DEFAULT_COLUMNS)

    // Ref para o input de busca
    const searchInputRef = useRef(null);

    // Helpers need to be defined before effects that use them, or be stable
    const groupDividendsByTicker = (dividends) => {
        return dividends.reduce((acc, dividend) => {
            let ticker = dividend.ticker.replace('.SA', '');
            // Se não termina com número, adiciona '3'
            if (!/\d$/.test(ticker)) {
                ticker = ticker + '3';
            }
            const { valor } = dividend;
            if (!acc[ticker]) {
                acc[ticker] = 0;
            }
            acc[ticker] += valor;
            return acc;
        }, {});
    };

    useEffect(() => {
        const savedOrder = localStorage.getItem('stocksColumnsOrder')
        if (savedOrder) {
            try {
                const parsedOrder = JSON.parse(savedOrder)
                // Validate if saved order has valid keys
                const isValid = parsedOrder.every(key => DEFAULT_COLUMNS.includes(key)) && parsedOrder.length === DEFAULT_COLUMNS.length
                if (isValid) {
                    setColumnsOrder(parsedOrder)
                }
            } catch (e) {
                console.error('Error parsing saved column order', e)
            }
        }
    }, [])

    useEffect(() => {
        setStocksList(stocks)
        setUpdatedStocksList(updated)
        const dividendsList = Array.isArray(dividends.dividends) ? dividends.dividends : [];
        const grouped = groupDividendsByTicker(dividendsList)
        setDividendsList(grouped)

    }, [fetchingAgain])

    const handleSearch = async () => {
        try {
            const searchResults = await searchStocks(stock)
            setResults(searchResults)

        } catch (error) {
            console.error('Error searching for stocks:', error);
        }
    }

    const stockInfo = async (stock) => {
        try {
            const stockDataResult = await stockData(stock)
            const stockDetails = stockDataResult["stock info: "]
            setStockClicked(stockDetails)
            setShowingStock(true)
        } catch (error) {
            console.error('Error fetching stock data:', error);
        }
    }

    const handleAddStock = async () => {
        try {
            const userId = sessionStorage.getItem('userId')

            const stockToAdd = {
                symbol: stockClicked.symbol,
                currency: stockClicked.currency,
                averagePrice: 0,
                stocksQuantity: 0,
                userId: userId
            }
            if (stocksList.some(stock => stock.symbol === stockToAdd.symbol)) {
                alert('Stock already exists in the list!')
                setShowingStock(false)
                setStock('')
                setResults([])
                return
            }

            const response = await addStock(stockToAdd)
            setRefresh(prevRefresh => prevRefresh + 1)
            alert(response.msg)
            setShowingStock(false)
            setStock('')
            setResults([])
            setSearchStock(false)

        } catch (error) {
            console.error('Error adding stock:', error);
        }
    }

    const handleStockClick = (stock) => {
        setSelectedStock(stock);
        setNewAveragePrice(stock.averagePrice);
        setStocksQuantity(stock.stocksQuantity);
    };

    const handleUpdateStockValues = async () => {
        if (selectedStock) {
            setUpdatingValues('Updating values...')
            try {
                const updatedStocks = updatedStocksList.map((stock) =>
                    stock.symbol === selectedStock.symbol
                        ? {
                            ...stock,
                            averagePrice: parseFloat(newAveragePrice),
                            stocksQuantity: parseFloat(stocksQuantity)
                        }
                        : stock
                );
                setUpdatedStocksList(updatedStocks);
                setStocksList(updatedStocks);

                await updateStock({
                    _id: selectedStock._id,
                    averagePrice: parseFloat(newAveragePrice),
                    stocksQuantity: parseFloat(stocksQuantity)
                })

                setSelectedStock(null);
                setNewAveragePrice('');
                setStocksQuantity('');
                setUpdatingValues('')
                setShowingStock(false)
            }
            catch (error) {
                console.error('Error updating stock:', error);
            }

        }
    }

    const handleCloseIconResultsContainer = () => {
        setShowingStock(false)
        setStock('')
        setResults([])
    }

    const handleDeleteStock = async (id) => {
        if (window.confirm('Are you sure you want to delete this stock?')) {
            try {
                await deleteStock(id)
                setUpdatedStocksList((prevStocks) => prevStocks.filter(stock => stock._id !== id))
                setSelectedStock(null)
                setShowingStock(false)
                setStock('')
                setResults([])
                setRefresh(prevRefresh => prevRefresh + 1)
            } catch (error) {
                console.error('Error deleting stock:', error);
            }
        }
    }

    const getAveragePriceDisplay = (value, currency) => {
        const formatted = formatCurrency(Number(value), currency);
        if (formatted === '-') return formatted;
        const normalizedCurrency = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
        if (normalizedCurrency === 'BRL') {
            return formatted.replace(/^R\$ /, '');
        }
        return formatted;
    };

    const handleOpenEditColumns = () => {
        setTempColumnsOrder([...columnsOrder])
        setIsEditingColumns(true)
    }

    const handleMoveColumn = (index, direction) => {
        const newOrder = [...tempColumnsOrder]
        const targetIndex = index + direction
        if (targetIndex >= 0 && targetIndex < newOrder.length) {
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
            setTempColumnsOrder(newOrder)
        }
    }

    const handleSaveColumns = () => {
        setColumnsOrder(tempColumnsOrder)
        localStorage.setItem('stocksColumnsOrder', JSON.stringify(tempColumnsOrder))
        setIsEditingColumns(false)
    }

    const handleResetColumns = () => {
        setTempColumnsOrder(DEFAULT_COLUMNS)
    }

    const renderCellContent = (key, stock, helpers) => {
        const {
            formatCurrency,
            getAveragePriceDisplay,
            formatPercent,
            percentageDifference,
            isPositive,
            isPositiveWithDividends,
            totalPercentageDifference,
            totalValue,
            valorizacao,
            dividendsAmount
        } = helpers

        switch (key) {
            case 'currentPrice':
                return formatCurrency(stock.currentPrice, stock.currency)
            case 'avgPrice':
                return getAveragePriceDisplay(stock.averagePrice, stock.currency)
            case 'dailyReturn':
                return (
                    <span style={{ color: (Number(stock.dayPriceChangePercent)) > 0 ? 'var(--chart-price-line)' : 'red' }}>
                        {stock.dayPriceChangePercent ? formatPercent(Number(stock.dayPriceChangePercent) * 100) : null}
                    </span>
                )
            case 'stockReturn':
                return (
                    <span style={{ color: isPositive ? 'var(--chart-price-line)' : 'red' }}>
                        {isFinite(Number(percentageDifference)) && Number(percentageDifference) !== 0
                            ? formatPercent(Number(percentageDifference))
                            : null}
                    </span>
                )
            case 'returnAndDiv':
                return (
                    <span style={{ color: isPositiveWithDividends ? 'var(--chart-price-line)' : 'red' }}>
                        {dividendsAmount > 0 && isFinite(Number(totalPercentageDifference)) && Number(totalPercentageDifference) !== 0
                            ? formatPercent(Number(totalPercentageDifference))
                            : null}
                    </span>
                )
            case 'totalValue':
                return formatCurrency(totalValue, stock.currency)
            case 'gain':
                return (
                    <span style={{ color: isPositive ? 'var(--chart-price-line)' : 'red' }}>
                        {formatCurrency(valorizacao, stock.currency === 'USD' ? 'USD' : 'BRL')}
                    </span>
                )
            case 'dividends':
                return formatCurrency(dividendsAmount, stock.currency)
            case 'stockQuantity':
                return Number(stock.stocksQuantity)
            default:
                return null
        }
    }

    // Calculations
    const totalInvestedBRL = updatedStocksList
        .filter(stock => stock.currency === 'BRL')
        .reduce((acc, stock) => acc + (stock.averagePrice * stock.stocksQuantity), 0);

    const totalCurrentValueBRL = updatedStocksList
        .filter(stock => stock.currency === 'BRL')
        .reduce((acc, stock) => acc + (stock.currentPrice * stock.stocksQuantity), 0);

    const percentualValorizacaoBRL = totalInvestedBRL > 0
        ? ((totalCurrentValueBRL - totalInvestedBRL) / totalInvestedBRL) * 100
        : 0;

    const totalInvestedUSD = updatedStocksList
        .filter(stock => stock.currency === 'USD')
        .reduce((acc, stock) => acc + (stock.averagePrice * stock.stocksQuantity), 0);
    const totalCurrentValueUSD = updatedStocksList
        .filter(stock => stock.currency === 'USD')
        .reduce((acc, stock) => acc + (stock.currentPrice * stock.stocksQuantity), 0);
    const percentualValorizacaoUSD = totalInvestedUSD > 0
        ? ((totalCurrentValueUSD - totalInvestedUSD) / totalInvestedUSD) * 100
        : 0;

    const uniqueTickers = [...new Set(updatedStocksList.map(stock => {
        let ticker = stock.symbol.replace('.SA', '');
        if (!/\d$/.test(ticker)) ticker = ticker + '3';
        return ticker;
    }))];

    const totalDividends = uniqueTickers.reduce((acc, ticker) => {
        return acc + (dividendsList[ticker] || 0);
    }, 0);

    const totalReturnPercent = totalInvestedBRL > 0
        ? (((totalCurrentValueBRL + totalDividends - totalInvestedBRL) / totalInvestedBRL) * 100)
        : 0;

    const brlStocks = updatedStocksList.filter(stock => stock.currency === 'BRL');
    const totalCurrentValue = brlStocks.reduce((acc, stock) => acc + (stock.currentPrice * stock.stocksQuantity), 0);
    const totalYesterdayValue = brlStocks.reduce((acc, stock) => {
        const yesterdayPrice = stock.currentPrice / (1 + (Number(stock.dayPriceChangePercent) || 0));
        return acc + (yesterdayPrice * stock.stocksQuantity);
    }, 0);

    const carteiraValorizacaoDia = totalYesterdayValue > 0
        ? ((totalCurrentValue - totalYesterdayValue) / totalYesterdayValue) * 100
        : 0;

    const usdStocks = updatedStocksList.filter(stock => stock.currency === 'USD');
    const totalCurrentValueUSD_Day = usdStocks.reduce((acc, stock) => acc + (stock.currentPrice * stock.stocksQuantity), 0);
    const totalYesterdayValueUSD = usdStocks.reduce((acc, stock) => {
        const yesterdayPrice = stock.currentPrice / (1 + (Number(stock.dayPriceChangePercent) || 0));
        return acc + (yesterdayPrice * stock.stocksQuantity);
    }, 0);

    const carteiraValorizacaoDiaUSD = totalYesterdayValueUSD > 0
        ? ((totalCurrentValueUSD_Day - totalYesterdayValueUSD) / totalYesterdayValueUSD) * 100
        : 0;

    let valorizacaoTotalBRL = 0
    let valorizacaoTotalUSD = 0

    return (
        <>
            <h1 className="stocks-container-title">Dashboard</h1>

            {selectedStock ?
                <div className="stock-edit">
                    <CloseIcon className='close-search-icon' onClick={() => setSelectedStock(null)} />
                    <DeleteIcon className='delete-icon' onClick={() => handleDeleteStock(selectedStock._id)} />

                    <h2>{selectedStock.symbol.replace('.SA', '')}</h2>
                    <p>Current Average Price: {selectedStock.averagePrice}</p>
                    <input
                        className='average-price-input'
                        type="number"
                        value={newAveragePrice}
                        onChange={(e) => setNewAveragePrice(e.target.value)}
                        placeholder="Enter new average price"
                    />

                    <p>Stock quantity: {selectedStock.stocksQuantity}</p>
                    <input
                        className='stock-quantity-input'
                        type="number"
                        onChange={(e) => setStocksQuantity(e.target.value)}
                        placeholder="Stock quantity"
                    />
                    <button className='update-values-button' onClick={handleUpdateStockValues}>Update values</button>
                    <button className='update-values-button' onClick={() => setSelectedStock(null)}>Cancel</button>
                    {updatingValues === '' ? null : <p className='updating-values'>{updatingValues}</p>}
                </div>

                :
                <div className="stocks-container-all">
                    <div className='stocks-list-wrapper'>
                        {searchStock ?
                            <div className="search-container">
                                <input
                                    className='search-input'
                                    type="text"
                                    placeholder="Enter stock name..."
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch()
                                        }
                                    }}
                                    ref={searchInputRef}
                                />
                                <button className='search-input-button' onClick={handleSearch}>Search</button>
                                <CloseIcon className='close-search-stock-icon' onClick={() => {
                                    setSearchStock(false)
                                    setShowingStock(false)
                                    setResults([])
                                    setStock('')
                                }}></CloseIcon>
                            </div> :
                            <SearchIcon className='search-icon' onClick={() => {
                                setSearchStock(true)
                                setStock('')
                                setResults([])
                                setTimeout(() => {
                                    if (searchInputRef.current) {
                                        searchInputRef.current.focus();
                                    }
                                }, 0);
                            }}></SearchIcon>
                        }

                        {updatedStocksList.length > 0 ? null :
                            <p className='no-stocks-message'>Search for a stock to add it to your portfolio.</p>
                        }

                        <div className="results-container">
                            {showingStock ? null :
                                <ul>
                                    {results.map((result, index) => (
                                        <li onClick={() => stockInfo(result.symbol)} key={index}>
                                            {result.symbol} - {result.shortname} ({result.exchDisp})
                                        </li>
                                    ))}
                                </ul>}
                            {showingStock ?
                                <div className="stock-data">
                                    <div className='stock-data-symbol-price'>
                                        <h2 className='stock-data-symbol'>{stockClicked.symbol.replace('.SA', '')}</h2>
                                        <h3 className='stock-data-price'>
                                            {formatCurrency(stockClicked.currentPrice, stockClicked.currency || 'BRL')}
                                        </h3>
                                    </div>

                                    <div className='stock-data-close-addIcon'>
                                        <CloseIcon className='stock-data-closeIcon' onClick={handleCloseIconResultsContainer}></CloseIcon>
                                        <AddIcon className='stock-data-addIcon' onClick={handleAddStock}></AddIcon>
                                    </div>
                                </div> : null}
                        </div>

                    </div>

                    {stocksList.filter(stock => stock.currency === 'BRL').length > 0 ?
                        <h2 className='stocks-list-title-BRL'>BRL Stocks</h2>
                        : null
                    }

                    <div className='stocks-list-container'>
                        {stocksList.filter(stock => stock.currency === 'BRL').length > 0 ? (
                            <div className="table-wrapper">
                                <table className='stocks-table'>
                                    <thead>
                                        <tr>
                                            <th className="sticky-column">
                                                Symbol
                                                <EditIcon className="edit-columns-icon" onClick={handleOpenEditColumns} />
                                            </th>
                                            {columnsOrder.map(key => (
                                                <th key={key}>{COLUMN_CONFIG[key].label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {updatedStocksList
                                            .filter(stock => stock.currency === 'BRL') // Filtra apenas ações em BRL
                                            .slice() // cria uma cópia para não alterar o estado original
                                            .sort((a, b) => {
                                                const dividendsA = dividendsList[a.symbol.replace('.SA', '')] || 0;
                                                const dividendsB = dividendsList[b.symbol.replace('.SA', '')] || 0;
                                                const totalPercA = (
                                                    (((a.currentPrice * a.stocksQuantity + dividendsA) - (a.averagePrice * a.stocksQuantity)) /
                                                        (a.averagePrice * a.stocksQuantity)) * 100
                                                );
                                                const totalPercB = (
                                                    (((b.currentPrice * b.stocksQuantity + dividendsB) - (b.averagePrice * b.stocksQuantity)) /
                                                        (b.averagePrice * b.stocksQuantity)) * 100
                                                );
                                                return totalPercB - totalPercA; // ordem decrescente
                                            })
                                            .map((stock, index) => {
                                                // Calculations
                                                const invested = stock.averagePrice * stock.stocksQuantity;
                                                const current = stock.currentPrice * stock.stocksQuantity;
                                                const valorizacaoBRL = (current - invested)
                                                valorizacaoTotalBRL += valorizacaoBRL;
                                                const dividendsAmount = dividendsList[stock.symbol.replace('.SA', '')] || 0;

                                                // Helpers object
                                                const helpers = {
                                                    formatCurrency,
                                                    getAveragePriceDisplay,
                                                    formatPercent,
                                                    percentageDifference: ((current - invested) / invested) * 100,
                                                    isPositive: ((current - invested) / invested) * 100 >= 0,
                                                    totalPercentageDifference: ((((current + dividendsAmount) - invested) / invested) * 100).toFixed(2),
                                                    isPositiveWithDividends: ((((current + dividendsAmount) - invested) / invested) * 100) >= 0,
                                                    totalValue: current,
                                                    valorizacao: valorizacaoBRL,
                                                    dividendsAmount
                                                }

                                                return (
                                                    <tr key={index}>
                                                        <td className="sticky-column" onClick={() => handleStockClick(stock)}>{stock.symbol.replace('.SA', '')}</td>
                                                        {columnsOrder.map(key => (
                                                            <td key={key}>
                                                                {renderCellContent(key, stock, helpers)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}

                                        {/* Totais */}
                                        {/* Since totals are hard, we might need to map them too or just leave them custom? 
                                            User reordered columns... totals row must align!
                                            The requested feature is column reordering. If I don't reorder totals, it will look broken.
                                            However, totals arithmetic is done in the loop.
                                            I should implement a `renderTotalCell` or similar to handle dynamic totals.
                                            But calculating totals for generic columns is tricky if logic is unique per column.
                                            For now, I will keep the totals row static or hide it if columns change?
                                            Actually, I should assume "Total" row also follows column config if possible.
                                            But "Total" row has specific logic for specific columns.
                                            If 'currentPrice' is moved, does 'Total' row have a "currentPrice" total? No, it's empty.
                                            Let's look at existing totals row.
                                            Columns: Symbol, Current Price (Empty), Avg Price (Total), Daily Return (Total %?), Stock Return (Total %?), Return & Div (Total %?), Total Value (Sum), Gain (Sum), Dividends (Sum), Quantity (Empty).
                                            
                                            If I reorder, I need to know WHICH total corresponds to which key.
                                            I can make a `TOTAL_CONFIG` mapping key to value.
                                         */}
                                        <tr>
                                            <td className="sticky-column"><strong>Total</strong></td>
                                            {columnsOrder.map(key => {
                                                switch (key) {
                                                    case 'avgPrice':
                                                        return <td key={key}><strong>{formatCurrency(totalInvestedBRL, 'BRL').replace('R$ ', '')}</strong></td>
                                                    case 'dailyReturn':
                                                        return <td key={key} style={{ color: carteiraValorizacaoDia >= 0 ? 'var(--chart-price-line)' : 'red' }}><strong>{formatPercent(Number(carteiraValorizacaoDia))}</strong></td>
                                                    case 'stockReturn':
                                                        return <td key={key}><strong>{formatPercent(percentualValorizacaoBRL)}</strong></td>
                                                    case 'returnAndDiv':
                                                        return <td key={key}><strong>{formatPercent(totalReturnPercent)}</strong></td>
                                                    case 'totalValue':
                                                        return <td key={key}><strong>{formatCurrency(totalCurrentValueBRL, 'BRL')}</strong></td>
                                                    case 'gain':
                                                        return <td key={key}><strong>{formatCurrency(valorizacaoTotalBRL, 'BRL')}</strong></td>
                                                    case 'dividends':
                                                        return <td key={key}><strong>{formatCurrency(updatedStocksList.filter(stock => stock.currency === 'BRL').reduce((acc, stock) => acc + (dividendsList[stock.symbol.replace('.SA', '')] || 0), 0), 'BRL')}</strong></td>
                                                    default:
                                                        return <td key={key}></td>
                                                }
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>

                    <div className="stocks-container-all">
                        {stocksList.filter(stock => stock.currency === 'USD').length > 0 ?
                            <h2 className='stocks-list-title-USD'>US Stocks</h2>
                            : null
                        }

                        <div className='stocks-list-container'>
                            {stocksList.filter(stock => stock.currency === 'USD').length > 0 ? (
                                <div className="table-wrapper">
                                    <table className='stocks-table'>
                                        <thead>
                                            <tr>
                                                <th className="sticky-column">
                                                    Symbol
                                                    <EditIcon className="edit-columns-icon" onClick={handleOpenEditColumns} />
                                                </th>
                                                {columnsOrder.map(key => (
                                                    <th key={key}>{COLUMN_CONFIG[key].label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {updatedStocksList
                                                .filter(stock => stock.currency === 'USD')
                                                .slice()
                                                .sort((a, b) => {
                                                    const dividendsA = dividendsList[a.symbol.replace('.SA', '')] || 0;
                                                    const dividendsB = dividendsList[b.symbol.replace('.SA', '')] || 0;
                                                    const totalPercA = (
                                                        (((a.currentPrice * a.stocksQuantity + dividendsA) - (a.averagePrice * a.stocksQuantity)) /
                                                            (a.averagePrice * a.stocksQuantity)) * 100
                                                    );
                                                    const totalPercB = (
                                                        (((b.currentPrice * b.stocksQuantity + dividendsB) - (b.averagePrice * b.stocksQuantity)) /
                                                            (b.averagePrice * b.stocksQuantity)) * 100
                                                    );
                                                    return totalPercB - totalPercA;
                                                })
                                                .map((stock, index) => {
                                                    // Calculations
                                                    const invested = stock.averagePrice * stock.stocksQuantity;
                                                    const current = stock.currentPrice * stock.stocksQuantity;
                                                    const valorizacaoUSD = (current - invested)
                                                    valorizacaoTotalUSD += valorizacaoUSD;
                                                    const dividendsAmount = dividendsList[stock.symbol.replace('.SA', '')] || 0;

                                                    // Helpers object
                                                    const helpers = {
                                                        formatCurrency,
                                                        getAveragePriceDisplay,
                                                        formatPercent,
                                                        percentageDifference: ((current - invested) / invested) * 100,
                                                        isPositive: ((current - invested) / invested) * 100 >= 0,
                                                        totalPercentageDifference: ((((current + dividendsAmount) - invested) / invested) * 100).toFixed(2),
                                                        isPositiveWithDividends: ((((current + dividendsAmount) - invested) / invested) * 100) >= 0,
                                                        totalValue: current,
                                                        valorizacao: valorizacaoUSD,
                                                        dividendsAmount
                                                    }

                                                    return (
                                                        <tr key={index}>
                                                            <td className="sticky-column" onClick={() => handleStockClick(stock)}>{stock.symbol.replace('.SA', '')}</td>
                                                            {columnsOrder.map(key => (
                                                                <td key={key}>
                                                                    {renderCellContent(key, stock, helpers)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}

                                            {/* Totais USD */}
                                            <tr>
                                                <td className="sticky-column"><strong>Total</strong></td>
                                                {columnsOrder.map(key => {
                                                    switch (key) {
                                                        case 'avgPrice':
                                                            return <td key={key}><strong>{formatCurrency(totalInvestedUSD, 'USD').replace('$ ', '')}</strong></td>
                                                        case 'dailyReturn':
                                                            return <td key={key} style={{ color: carteiraValorizacaoDiaUSD >= 0 ? 'var(--chart-price-line)' : 'red' }}><strong>{formatPercent(Number(carteiraValorizacaoDiaUSD))}</strong></td>
                                                        case 'stockReturn':
                                                            return <td key={key}><strong>{formatPercent(percentualValorizacaoUSD)}</strong></td>
                                                        // Return and Div for USD? Not calculated in original? 
                                                        // Original had: percentualValorizacaoUSD in 'Return & Div' column? No. 
                                                        // Original BRL had 'totalReturnPercent'. USD had ... check original
                                                        // Original USD row: 
                                                        // 1. Total (Symbol)
                                                        // 2. Empty (Current Price)
                                                        // 3. totalInvestedUSD (Avg Price)
                                                        // 4. carteiraValorizacaoDiaUSD (Daily Return)
                                                        // 5. percentualValorizacaoUSD (Stock Return)
                                                        // 6. Empty (Return & Div) -> WAIT. 
                                                        // In Step 168:
                                                        // <td></td> (col 6)
                                                        // So for USD, 'returnAndDiv' total is empty.
                                                        case 'returnAndDiv':
                                                            return <td key={key}></td>
                                                        case 'totalValue':
                                                            return <td key={key}><strong>{formatCurrency(totalCurrentValueUSD, 'USD')}</strong></td>
                                                        case 'gain':
                                                            return <td key={key}><strong>{formatCurrency(valorizacaoTotalUSD, 'USD')}</strong></td>
                                                        case 'dividends':
                                                            return <td key={key}></td> // Divs empty in USD total
                                                        default:
                                                            return <td key={key}></td>
                                                    }
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>

                        <div style={{ marginTop: '40px' }}>
                            <Snapshots
                                userId={typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null}
                            />
                        </div>

                        <h2 className='footer'>Yield Management</h2>
                    </div>

                    {isEditingColumns && (
                        <div className="edit-columns-modal-overlay">
                            <div className="edit-columns-modal">
                                <h3>Organize Columns</h3>
                                <ul className="columns-list">
                                    {tempColumnsOrder.map((key, index) => (
                                        <li key={key} className="column-item">
                                            <span className="column-label">{COLUMN_CONFIG[key].label}</span>
                                            <div className="column-actions">
                                                <button
                                                    className="move-btn"
                                                    disabled={index === 0}
                                                    onClick={() => handleMoveColumn(index, -1)}
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    className="move-btn"
                                                    disabled={index === tempColumnsOrder.length - 1}
                                                    onClick={() => handleMoveColumn(index, 1)}
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="modal-actions">
                                    <button className="reset-btn" onClick={handleResetColumns}>Reset default</button>
                                    <button className="cancel-btn" onClick={() => setIsEditingColumns(false)}>Cancel</button>
                                    <button className="save-btn" onClick={handleSaveColumns}>Save</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
        </>
    )
}

export default Stocks