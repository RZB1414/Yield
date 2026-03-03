import Brokers from '../Brokers';
import './Info.css';
import { useEffect, useState } from 'react';
import { ReactComponent as CloseIcon } from '../../assets/icons/close-icon.svg';
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete-icon.svg';
import { btgTransactions } from '../Connect';
import { deleteCardTransaction } from '../../services/creditCards';
import { formatBRL } from '../../utils/format';

const Info = ({ filteredDividends, dividends, brokersData, totalValuesData, cardValues, fetchingAgain,setRefresh }) => {

    const [groupedByTicker, setGroupedByTicker] = useState({});
    const [monthCardsClicked, setMonthCardsClicked] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Inicializa com o ano atual

    useEffect(() => {
        const grouped = groupDividendsByTicker(filteredDividends)
        // Agrega NOTA BTG a partir de btgTransactions
        const btgAgg = aggregateBtgTransactions(btgTransactions, selectedYear)
        const merged = { ...grouped }
        if (btgAgg) {
            if (!merged['NOTA BTG']) merged['NOTA BTG'] = { total: 0 }
            // mes -> valor
            Object.entries(btgAgg.months).forEach(([m, v]) => {
                merged['NOTA BTG'][m] = v
            })
            merged['NOTA BTG'].total = btgAgg.total
        }
        setGroupedByTicker(merged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dividends, filteredDividends, selectedYear, cardValues]);


    // Função para agrupar dividendos por ticker, ano e mês (mantém chave interna em mês longo default)
    const groupDividendsByTicker = (dividends) => {
        const grouped = {};
        dividends.forEach((dividend) => {
            const date = new Date(dividend.liquidacao);
            const year = date.getFullYear();
            const month = date.toLocaleString('default', { month: 'long' }); // chave interna (ex: janeiro, fevereiro)
            const ticker = dividend.ticker;
            if (!grouped[ticker]) grouped[ticker] = { total: 0 };
            if (!grouped[ticker][month]) grouped[ticker][month] = 0;
            if (year === selectedYear) {
                grouped[ticker][month] += dividend.valor;
                grouped[ticker].total += dividend.valor;
            }
        });
        return grouped;
    };

    // Agrega btgTransactions para linha NOTA BTG
    const aggregateBtgTransactions = (transactions, year) => {
        if (!Array.isArray(transactions)) return null;
        const monthsData = {};
        let total = 0;
        transactions.forEach(t => {
            if (!t.date && !t.liquidacao) return;
            const lanc = (t.lancamento || '').toUpperCase();
            if (!['COMPRA', 'VENDA'].includes(lanc)) return;
            const d = new Date(t.liquidacao || t.date);
            if (isNaN(d) || d.getFullYear() !== year) return;
            const month = d.toLocaleString('default', { month: 'long' }); // mesma chave interna
            const valRaw = typeof t.valor === 'number' ? t.valor : Number(t.valor) || 0;
            monthsData[month] = (monthsData[month] || 0) + valRaw;
            total += valRaw;
        });
        return { months: monthsData, total };
    };




    // Obtém os anos disponíveis
    const getAvailableYears = () => {
        const years = [...new Set(dividends.dividends.map(dividend => new Date(dividend.liquidacao).getFullYear()))];
        return years.sort((a, b) => b - a); // Ordena em ordem decrescente
    };

    // Função para lidar com o clique em um mês específico
    const handleCardsOfMonth = (cards, internalMonthKey) => {
        // internalMonthKey é mês longo default
        const monthCards = cards.filter(card => new Date(card.date).toLocaleString('default', { month: 'long' }) === internalMonthKey);
        if (monthCards.length > 0) {
            setMonthCardsClicked(monthCards);
        } else {
            alert(`No cards found for ${internalMonthKey}`);
        }
    }

    return (
        <>

        <div className="dividends-container">
            
            {/* Botão para selecionar o ano */}
            <div className="year-selector">
                <label htmlFor="year-select">Select Year:</label>
                <select
                    id="year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="year-select"
                >
                    {getAvailableYears().map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {Object.keys(groupedByTicker).length > 0 ? (
                <div className="table-wrapper">
                    <table className="stocks-table">
                        <thead>
                            <tr>
                                <th className="sticky-column">Ticker</th>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const internal = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    return <th key={internal}>{new Date(0, i).toLocaleString('en-US', { month: 'short' })}</th>;
                                })}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Linha 1: NOTA */}
                            <tr>
                                <td className="sticky-column">Nota XP</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const internal = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    return (
                                        <td className='month-cell' key={internal}>{groupedByTicker["NOTA"]?.[internal] !== undefined ? formatBRL(groupedByTicker["NOTA"][internal], { abs: true }) : '-'}</td>
                                    );
                                })}
                                <td className='month-cell-total'>{groupedByTicker["NOTA"]?.total !== undefined ? formatBRL(groupedByTicker["NOTA"].total, { abs: true }) : '-'}</td>
                            </tr>
                            {/* Linha 1b: NOTA BTG */}
                            <tr>
                                <td className="sticky-column">Nota BTG</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const internal = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    return (
                                        <td className='month-cell' key={internal}>{groupedByTicker["NOTA BTG"]?.[internal] ? formatBRL(groupedByTicker["NOTA BTG"][internal]) : '-'}</td>
                                    );
                                })}
                                <td className='month-cell-total'>{groupedByTicker["NOTA BTG"]?.total ? formatBRL(groupedByTicker["NOTA BTG"].total) : '-'}</td>
                            </tr>



                            {/* Linha 2: RENDIMENTO RENDA FIXA */}
                            <tr>
                                <td className="sticky-column">Renda Fixa</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const internal = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    return (
                                        <td className='month-cell' key={internal}>{groupedByTicker["RENDIMENTO RENDA FIXA"]?.[internal] ? formatBRL(groupedByTicker["RENDIMENTO RENDA FIXA"][internal]) : '-'}</td>
                                    );
                                })}
                                <td className='month-cell-total'>{groupedByTicker["RENDIMENTO RENDA FIXA"]?.total ? formatBRL(groupedByTicker["RENDIMENTO RENDA FIXA"].total) : '-'}</td>
                            </tr>

                            {/* Linha 3: CARTAO DE CREDITO */}
                            <tr>
                                <td className="sticky-column">Cartão XP</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const internal = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    return (
                                        <td className='month-cell' key={internal}>{groupedByTicker["CARTAO DE CREDITO"]?.[internal] !== undefined ? formatBRL(groupedByTicker["CARTAO DE CREDITO"][internal], { abs: true }) : '-'}</td>
                                    );
                                })}
                                <td className='month-cell-total'>{groupedByTicker["CARTAO DE CREDITO"]?.total !== undefined ? formatBRL(groupedByTicker["CARTAO DE CREDITO"].total, { abs: true }) : '-'}</td>
                            </tr>

                            {/* Linha 4: CASHBACK CARTAO */}
                            <tr>
                                <td className="sticky-column">Cashback</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const internal = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    return (
                                        <td className='month-cell' key={internal}>{groupedByTicker["CASHBACK CARTAO"]?.[internal] ? formatBRL(groupedByTicker["CASHBACK CARTAO"][internal]) : '-'}</td>
                                    );
                                })}
                                <td className='month-cell-total'>{groupedByTicker["CASHBACK CARTAO"]?.total ? formatBRL(groupedByTicker["CASHBACK CARTAO"].total) : '-'}</td>
                            </tr>
                            {/* Linha 5: CREDIT CARDS */}
                            <tr>
                                <td className="sticky-column">Credit Cards</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const internal = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    const cardsOfMonth = cardValues.filter(card => new Date(card.date).getFullYear() === selectedYear && new Date(card.date).toLocaleString('default', { month: 'long' }) === internal);
                                    const total = cardsOfMonth.reduce((acc, card) => acc + card.value, 0);
                                    return (
                                        <td
                                            className='month-cell'
                                            key={internal}
                                            style={{ cursor: total > 0 ? 'pointer' : 'default' }}
                                            onClick={() => {
                                                if (total > 0) handleCardsOfMonth(cardsOfMonth, internal)
                                            }}
                                            title={internal}
                                        >
                                            {total > 0 ? formatBRL(total) : '-'}
                                        </td>
                                    );
                                })}
                                <td className='month-cell-total'>
                                    {(() => {
                                        const totalCards = cardValues
                                            .filter(card => new Date(card.date).getFullYear() === selectedYear)
                                            .reduce((acc, card) => acc + card.value, 0);
                                        return totalCards > 0 ? formatBRL(totalCards) : '-';
                                    })()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className='dividends-no-data'>No data available for {selectedYear}</p>
            )}
        </div>

        <div className="cards-of-month-container">
            {monthCardsClicked.length > 0 ? (
                <div className="cards-of-month">
                    <h2>Credit cards {monthCardsClicked[0] && new Date(monthCardsClicked[0].date).toLocaleString('en-US', { month: 'short', year: 'numeric' })}</h2>
                    <ul>
                        {monthCardsClicked.map((card, idx) => (
                            <li key={card._id || card.id || idx}>
                                {card.name || card.bank}: {formatBRL(card.value)}
                                <DeleteIcon
                                    className="delete-cardicon"
                                    onClick={async () => {
                                        if (!window.confirm(`Delete the card transaction for ${card.bank} ${card.value}?`)) {
                                            return;
                                        }
                                        await deleteCardTransaction(card._id);
                                        cardValues.splice(cardValues.indexOf(card), 1); // Remove the card from the local state
                                        setRefresh(prev => prev + 1)
                                        setMonthCardsClicked([])
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                    <CloseIcon className="close-icon" onClick={() => setMonthCardsClicked([])} />
                </div>
            ) : null }
        </div>

        <Brokers brokersData={brokersData} totalValuesData={totalValuesData} fetchingAgain={fetchingAgain} setRefresh={setRefresh}/>
        </>
    );
};

export default Info;