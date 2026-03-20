import './Dividends.css'
import { useEffect, useState } from 'react'
import { dividends } from '../Connect'
import { btgDividends } from '../Connect'
import { ReactComponent as BrokerIcon } from '../../assets/icons/broker-icon.svg'
import { formatBRL } from '../../utils/format'

const Dividends = ({ fetchingAgain }) => {

    const [dividendsList, setDividendsList] = useState([])
    const [filteredDividends, setFilteredDividends] = useState([])
    const [groupedDividends, setGroupedDividends] = useState({})
    const [overallStartDate, setOverallStartDate] = useState('')
    const [overallEndDate, setOverallEndDate] = useState('')
    const [showingAllPeriod, setShowingAllPeriod] = useState(false)
    const [detailedDividends, setDetailedDividends] = useState([])
    const [showingDetailed, setShowingDetailed] = useState(false)
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [showMonthFilter, setShowMonthFilter] = useState(false)
    const [showYearFilter, setShowYearFilter] = useState(false)
    const [noDividends, setNoDividends] = useState(false)
    const [selectedBroker, setSelectedBroker] = useState('ALL') // ALL default to show union
    const [showBrokerSelect, setShowBrokerSelect] = useState(false)
    const [combinedList, setCombinedList] = useState([])

    useEffect(() => {
        // Reset states when switching broker or refetching
        setNoDividends(false);
        setFilteredDividends([])
        setGroupedDividends({})
        setShowingAllPeriod(false)
        setShowingDetailed(false)
        

        let sourceList = []

        // Normaliza listas para junção
        const xpList = (dividends?.dividends || []).map(d => ({
            ...d,
            liquidacao: d.liquidacao || d.date, // segurança
            valor: typeof d.valor === 'number' ? d.valor : Number(d.valor) || 0
        }))
        const btgList = (btgDividends || []).map(d => ({
            ...d,
            liquidacao: d.liquidacao || d.date,
            valor: typeof d.valor === 'number' ? d.valor : Number(d.valor) || 0
        }))
        const merged = [...xpList, ...btgList]
        setCombinedList(merged)
        if (selectedBroker === 'XP') {
            if (dividends?.dividends?.length > 0) {
                sourceList = dividends.dividends
            }
        } else if (selectedBroker === 'BTG') {
            if (btgDividends?.length > 0) {
                // Mapeia para o formato esperado (usa 'date' ou 'liquidacao')
                sourceList = btgDividends.map(d => ({
                    ...d,
                    liquidacao: d.liquidacao || d.date, // unifica campo de data
                    valor: typeof d.valor === 'number' ? d.valor : Number(d.valor) || 0
                }))
            }
        } else if (selectedBroker === 'ALL') {
            sourceList = merged
        }

        if (sourceList.length > 0) {
            setDividendsList(sourceList)
            // Calcula datas gerais
            const startDate = sourceList.reduce(
                (earliest, dividend) =>
                    new Date(dividend.liquidacao) < new Date(earliest)
                        ? dividend.liquidacao
                        : earliest,
                sourceList[0]?.liquidacao || ''
            )
            const endDate = sourceList.reduce(
                (latest, dividend) =>
                    new Date(dividend.liquidacao) > new Date(latest)
                        ? dividend.liquidacao
                        : latest,
                sourceList[0]?.liquidacao || ''
            )
            setOverallStartDate(startDate ? new Date(startDate).toLocaleDateString('pt-BR') : '')
            setOverallEndDate(endDate ? new Date(endDate).toLocaleDateString('pt-BR') : '')
        } else {
            setDividendsList([])
            setNoDividends(true)
        }
    }, [fetchingAgain, selectedBroker])

    useEffect(() => {
        // Agrupa os dividendos por ticker e soma os valores
        const grouped = groupDividendsByTicker(filteredDividends)
        setGroupedDividends(grouped)
    }, [filteredDividends])

    // Função para agrupar dividendos por ticker e somar os valores
    const groupDividendsByTicker = (dividends) => {        
        return dividends.reduce((acc, dividend) => {
            // Remove números do ticker usando expressão regular
            const ticker = dividend.ticker.replace(/(?<!\d)11(?!\d)|\d+/g, match => match === '11' ? '11' : '')
            const { valor } = dividend;
            if (!acc[ticker]) {
                acc[ticker] = 0;
            }
            acc[ticker] += valor;
            return acc;
        }, {});
    };

    // Funções de filtro
    const filterByCurrentMonth = () => {
        const now = new Date();
    const base = selectedBroker === 'ALL' ? combinedList : dividendsList;
    const filtered = base.filter(dividend => {
            const date = new Date(dividend.liquidacao);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
        setFilteredDividends(filtered);
        setShowingAllPeriod(false);
        setShowingDetailed(false);
        setShowYearFilter(false);
        setShowMonthFilter(false)
    };

    const filterBySelectedMonth = () => {
    const base = selectedBroker === 'ALL' ? combinedList : dividendsList;
    const filtered = base.filter(dividend => {
            const date = new Date(dividend.liquidacao);
            return date.getMonth() === selectedMonth && date.getFullYear() === new Date().getFullYear();
        });
        setFilteredDividends(filtered);
        setShowingAllPeriod(false);
        setShowingDetailed(false);
        setShowYearFilter(false);
    }

    const filterByCurrentYear = () => {
        const now = new Date();
    const base = selectedBroker === 'ALL' ? combinedList : dividendsList;
    const filtered = base.filter(dividend => {
            const date = new Date(dividend.liquidacao);
            return date.getFullYear() === now.getFullYear();
        });
        setFilteredDividends(filtered);
        setShowingAllPeriod(false);
        setShowingDetailed(false);
        setShowYearFilter(false);
        setShowMonthFilter(false)
    };

    const filterByYear = () => {
    const base = selectedBroker === 'ALL' ? combinedList : dividendsList;
    const filtered = base.filter(dividend => {
            const date = new Date(dividend.liquidacao);
            return date.getFullYear() === selectedYear;
        });
        setFilteredDividends(filtered);
        setShowingAllPeriod(false);
        setShowingDetailed(false);
        setShowMonthFilter(false)
    };

    const filterByAllTime = () => {
    const base = selectedBroker === 'ALL' ? combinedList : dividendsList;
    setFilteredDividends(base);
        setShowingAllPeriod(true);
        setShowingDetailed(false);
        setShowYearFilter(false);
        setShowMonthFilter(false)
    };

    const handleDetailedDividends = () => {
        const detailedDividendsList = filteredDividends.map(dividend => {
            const date = new Date(dividend.liquidacao).toLocaleDateString('pt-BR');
            return {
                ...dividend,
                liquidacao: date
            };
        });
        setDetailedDividends(detailedDividendsList);
        setShowingAllPeriod(false);
        setShowingDetailed(true);
        setShowYearFilter(false);
    }

    const simpleDividends = () => {
        setShowingDetailed(false);
    }

    const getAvailableYears = () => {
        // Extrai os anos únicos da lista de dividendos
    const base = selectedBroker === 'ALL' ? combinedList : dividendsList;
    const years = [...new Set(base.map(dividend => new Date(dividend.liquidacao).getFullYear()))];
        return years.sort((a, b) => b - a); // Ordena os anos em ordem decrescente
    }

    const yearFilter = () => {
        setShowYearFilter(!showYearFilter)
        setShowMonthFilter(false)
    }

    const getAvailableMonths = () => {
        // Extrai os meses únicos da lista de dividendos no ano atual
        const now = new Date();
        const currentYear = now.getFullYear();
        const base = selectedBroker === 'ALL' ? combinedList : dividendsList;
        const months = [...new Set(
            base
                .filter(dividend => new Date(dividend.liquidacao).getFullYear() === currentYear)
                .map(dividend => new Date(dividend.liquidacao).getMonth())
        )];
        return months.sort((a, b) => a - b); // Ordena os meses em ordem crescente
    };

    const handleMonthFilter = () => {
        setShowMonthFilter(!showMonthFilter)
        setShowYearFilter(false)
    }

    const handleBrokerChange = (e) => {
        setSelectedBroker(e.target.value)
    }

    const toggleBrokerSelect = () => {
        setShowBrokerSelect(prev => !prev)
    }

    return (
        <div className="dividends-container">
            <h1 className='dividends-title'>Dividends</h1>
            <BrokerIcon className='dividends-broker-icon' onClick={toggleBrokerSelect} style={{ cursor: 'pointer' }} />
            {showBrokerSelect && (
                <div className='dividends-broker-select'>
                    <label htmlFor="broker-select">Broker:</label>
                    <select id="broker-select" value={selectedBroker} onChange={handleBrokerChange} className='dividends-year-select'>
                        <option value="ALL">ALL</option>
                        <option value="XP">XP</option>
                        <option value="BTG">BTG</option>
                    </select>
                </div>
            )}

            {noDividends ? (
                <p className='dividends-no-data'>No Dividends To Show</p>
            ) : (
                <>
                    {showingAllPeriod ? <p className='overall-date'>Overall Date: {overallStartDate} - {overallEndDate}</p> : null}

                    {/* Botões de filtro */}
                    <div className='dividends-buttons'>
                        <button onClick={filterByCurrentMonth} className='dividends-button'>This Month</button>
                        <button onClick={handleMonthFilter} className='dividends-button'>By Month</button>
                        <button onClick={filterByCurrentYear} className='dividends-button'>This year</button>
                        <button onClick={yearFilter} className='dividends-button'>By year</button>
                        <button onClick={filterByAllTime} className='dividends-button'>All Period</button>
                    </div>
                    <div className='dividends-detailed'>
                        <button onClick={simpleDividends} className='dividends-detailed-button'>Simple</button>
                        <button onClick={handleDetailedDividends} className='dividends-detailed-button'>Detailed</button>
                    </div>

                    {/* Campo de seleção de mês */}
                    {showMonthFilter && (
                        <div className='dividends-year-filter'>
                            <label htmlFor="month-select">Select Month:</label>
                            <select
                                id="month-select"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className='dividends-year-select'
                            >
                                <option value="">---</option>
                                {getAvailableMonths().map(month => (
                                    <option key={month} value={month}>
                                        {new Date(0, month).toLocaleString('en-US', { month: 'short' })}
                                    </option>
                                ))}
                            </select>
                            <button onClick={filterBySelectedMonth} className='dividends-byyear-button'>Filter by Month</button>
                        </div>
                    )}

                    {/* Campo de seleção de ano */}
                    {showYearFilter && (
                        <div className='dividends-year-filter'>
                            <label htmlFor="year-select">Select Year:</label>
                            <select
                                id="year-select"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className='dividends-year-select'
                            >
                                <option value="">---</option>
                                {getAvailableYears().map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <button onClick={filterByYear} className='dividends-byyear-button'>Filter by Year</button>
                        </div>
                    )}

                    {/* Soma total */}
                    <h3 className='dividends-total'>
                        Total: {formatBRL(showingDetailed
                            ? detailedDividends.reduce((sum, dividend) => sum + dividend.valor, 0)
                            : Object.values(groupedDividends).reduce((sum, total) => sum + total, 0))}
                    </h3>

                    {showingDetailed ? (
                        detailedDividends.length > 0 ? (
                            <ul className='dividends-list'>
                                {detailedDividends.map((dividend, index) => (
                                    <li className='dividends-list-item' key={index}>
                                        <p className='dividends-list-item-liquidacao'>{dividend.liquidacao}</p>
                                        <p className='dividends-list-item-ticker'>{dividend.ticker}</p>
                                        <p className='dividends-list-item-valor'>{formatBRL(dividend.valor, { prefix: '' })}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className='dividends-no-data'>No results for this period</p>
                        )) : null}

                    {showingDetailed ? null :
                        Object.keys(groupedDividends).length > 0 ? (
                            <ul className='dividends-list'>
                                {Object.entries(groupedDividends)
                                    .sort(([, totalA], [, totalB]) => totalB - totalA)
                                    .map(([ticker, total]) => (
                                        <li className='dividends-list-item' key={ticker}>
                                            <p className='dividends-simplelist-ticker'>{ticker}</p>
                                            <p className='dividends-simplelist-valor'>{formatBRL(total)}</p>
                                        </li>
                                    ))}
                            </ul>
                        ) : (
                            <p className='dividends-no-data'>No results for this period</p>
                        )}
                </>
            )}
        </div>
    )
}

export default Dividends