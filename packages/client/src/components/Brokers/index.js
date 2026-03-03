import React, { useEffect, useRef, useState } from 'react';
import { addBroker } from '../../services/brokers';
import './Brokers.css';
import { ReactComponent as CloseIcon } from '../../assets/icons/close-icon.svg';
import { ReactComponent as AddIcon } from '../../assets/icons/add-circle-icon.svg';
import { ReactComponent as SearchIcon } from '../../assets/icons/search-icon.svg';
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete-icon.svg';
import { ReactComponent as DateIcon } from '../../assets/icons/date-icon.svg';
import { addTotalValue, deleteTotalValue } from '../../services/totalValues';

// Lista das principais moedas do mundo
const CURRENCIES = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'RUB', name: 'Russian Ruble' },
    { code: 'ARS', name: 'Argentine Peso' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'ZAR', name: 'South African Rand' },
    { code: 'TRY', name: 'Turkish Lira' },
    { code: 'KRW', name: 'South Korean Won' },
    { code: 'HKD', name: 'Hong Kong Dollar' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'SEK', name: 'Swedish Krona' },
    { code: 'NOK', name: 'Norwegian Krone' },
    { code: 'NZD', name: 'New Zealand Dollar' },
    { code: 'PLN', name: 'Polish Zloty' },
    { code: 'DKK', name: 'Danish Krone' },
    { code: 'CLP', name: 'Chilean Peso' },
    { code: 'COP', name: 'Colombian Peso' },
    { code: 'IDR', name: 'Indonesian Rupiah' },
    { code: 'THB', name: 'Thai Baht' },
    { code: 'EGP', name: 'Egyptian Pound' },
    { code: 'SAR', name: 'Saudi Riyal' },
    { code: 'AED', name: 'UAE Dirham' },
];

const Brokers = ({ brokersData, totalValuesData, setRefresh, fetchingAgain }) => {
    // Formata número no padrão brasileiro: milhar com ponto e decimais com vírgula
    const formatNumber = (val) => {
        if (val === null || val === undefined || val === '') return '--';
        const num = Number(val);
        if (isNaN(num)) return '--';
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const [selectedDate, setSelectedDate] = useState('');
    const [currencySearch, setCurrencySearch] = useState('');
    const filteredCurrencies = CURRENCIES.filter(currency =>
        currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
        currency.name.toLowerCase().includes(currencySearch.toLowerCase())
    );
    const [isSearchingCurrency, setIsSearchingCurrency] = useState(false);

    const [brokers, setBrokers] = useState(brokersData || []);
    const [newBrokerName, setNewBrokerName] = useState('');
    const [newBrokerCurrency, setNewBrokerCurrency] = useState('');
    const [selectedBroker, setSelectedBroker] = useState(null);
    const [isAddingBroker, setIsAddingBroker] = useState(false);
    const [isAddingTotalValue, setIsAddingTotalValue] = useState(false);
    const [isSearchingTotalValue, setIsSearchingTotalValue] = useState(false);
    const [totalValues, setTotalValues] = useState(totalValuesData || []);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchBroker, setSearchBroker] = useState('');
    const [searchMonth, setSearchMonth] = useState('');
    const [dollarRate, setDollarRate] = useState(null);
    const [amountBRL, setAmountBRL] = useState('');
    const [amountUSD, setAmountUSD] = useState('');
    const [lastChanged, setLastChanged] = useState(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        setSelectedYear(new Date().getFullYear());
        setBrokers(brokersData || []);
        setTotalValues(totalValuesData);

    }, [brokersData, totalValuesData, fetchingAgain])

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const availableYears = [...new Set(totalValues.map(value => new Date(value.date).getFullYear()))];


    const getBrokerMonthlyTotals = (broker, monthIndex, year = selectedYear) => {
        const monthlyValue = totalValues.find(value => {
            if (!value.date) return false;
            const [y, m] = value.date.split('-');
            return (
                value.broker.broker === broker &&
                Number(m) - 1 === monthIndex &&
                Number(y) === year
            );
        });

        const totalUSD = monthlyValue ? parseFloat(monthlyValue.totalValueInUSD || 0) : 0;
        const totalBRL = monthlyValue ? parseFloat(monthlyValue.totalValueInBRL || 0) : 0;

        return { totalUSD, totalBRL };
    };

    const handleAddBroker = async () => {
        if (newBrokerName.trim() !== '' && newBrokerCurrency.trim() !== '') {
            const userId = sessionStorage.getItem('userId');
            try {
                const newBroker = {
                    brokerName: newBrokerName,
                    currency: newBrokerCurrency,
                    userId: userId
                };
                const addedBroker = await addBroker(newBroker);
                setBrokers([...brokers, addedBroker]);
                setNewBrokerName('');
                setNewBrokerCurrency('');
                setIsAddingBroker(false);
            } catch (error) {
                console.error('Error adding broker:', error);
            }
        }
    };

    const handleSelectBroker = (event) => {
        const selectedBrokerName = event.target.value;
        const broker = brokers.find(b => b.broker === selectedBrokerName);
        setSelectedBroker(broker)
    };

    const handleAddTotalValue = async (event) => {
        event.preventDefault();
        const userId = sessionStorage.getItem('userId')
        const date = event.target[0].value; // já está no formato 'YYYY-MM-DD'
        const amountInUSD = event.target[1].value;
        const amountInBRL = event.target[2].value;
        if (date && amountInBRL && amountInUSD && selectedBroker) {
            const totalValue = {
                date: date, // envie a string, não o objeto Date
                currency: selectedBroker.currency,
                totalValueInBRL: amountInBRL,
                totalValueInUSD: amountInUSD,
                broker: selectedBroker,
                userId: userId
            };
            try {
                const result = await addTotalValue(totalValue);
                setRefresh(prevRefresh => prevRefresh + 1)
                alert(result.msg)
                setIsAddingTotalValue(false);
                setAmountBRL('');
                setAmountUSD('');
                setDollarRate(null);
            } catch (error) {
                alert('Error adding total value:', error.msg);
            }
        } else {
            alert('Please fill in all fields and select a broker');
        }
    };

    const calculateMonthlyTotals = () => {
        const monthlyTotals = months.map((_, monthIndex) => {
            let totalUSD = 0;
            let totalBRL = 0;

            totalValues.forEach(value => {
                const [year, month] = value.date.split('-');
                if (
                    Number(month) - 1 === monthIndex &&
                    Number(year) === selectedYear
                ) {
                    totalUSD += parseFloat(value.totalValueInUSD || 0);
                    totalBRL += parseFloat(value.totalValueInBRL || 0);
                }
            })

            return { totalUSD, totalBRL };
        });

        return monthlyTotals;
    };

    // Função para filtrar os valores conforme busca
    const filteredTotalValues = totalValues.filter(value => {
        const [year, month] = value.date.split('-');
        const matchesYear = Number(year) === selectedYear;
        const matchesBroker = searchBroker ? value.broker.broker === searchBroker : true;
        const matchesMonth = searchMonth ? Number(month) === Number(searchMonth) : true;
        return matchesYear && matchesBroker && matchesMonth;
    });

    // Brokers e meses únicos para os selects
    const uniqueBrokers = [...new Set(totalValues
        .filter(v => Number(v.date.split('-')[0]) === selectedYear)
        .map(v => v.broker.broker)
    )];
    const uniqueMonths = [...new Set(totalValues
        .filter(v => Number(v.date.split('-')[0]) === selectedYear)
        .map(v => Number(v.date.split('-')[1]))
    )].sort((a, b) => a - b);

    const handleDeleteTotalValue = async (event) => {
        const id = event._id;
        if (id) {
            try {
                const result = await deleteTotalValue(id)
                setIsSearchingTotalValue(false)
                setSearchBroker('');
                setSearchMonth('');
                alert(result.message)
                setRefresh(prevRefresh => prevRefresh + 1)
            } catch (error) {
                alert('Error deleting total value:', error.msg)
            }
        } else {
            alert('Please select a total value to delete')
        }
    }

    // Função para calcular o percentual de valorização
    const getValorization = (broker, monthIndex, year = selectedYear) => {
        // Valor atual
        const current = totalValues.find(value => {
            if (!value.date) return false;
            const [y, m] = value.date.split('-');
            return (
                value.broker.broker === broker &&
                Number(m) - 1 === monthIndex &&
                Number(y) === year
            );
        });

        // Descobrir mês e ano anterior
        let prevMonth = monthIndex - 1;
        let prevYear = year;
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear = year - 1;
        }

        // Valor anterior
        const previous = totalValues.find(value => {
            if (!value.date) return false;
            const [y, m] = value.date.split('-');
            return (
                value.broker.broker === broker &&
                Number(m) - 1 === prevMonth &&
                Number(y) === prevYear
            );
        });

        // Se não houver valor anterior, retorna null
        if (!current || !previous) return null;

        // Calcula percentual de valorização para USD e BRL
        const valorizationUSD = previous.totalValueInUSD && previous.totalValueInUSD !== "0"
            ? ((parseFloat(current.totalValueInUSD) - parseFloat(previous.totalValueInUSD)) / Math.abs(parseFloat(previous.totalValueInUSD))) * 100
            : null;
        const valorizationBRL = previous.totalValueInBRL && previous.totalValueInBRL !== "0"
            ? ((parseFloat(current.totalValueInBRL) - parseFloat(previous.totalValueInBRL)) / Math.abs(parseFloat(previous.totalValueInBRL))) * 100
            : null;

        return {
            valorizationUSD,
            valorizationBRL
        };
    };

    const getTotalValorization = (currency, monthIndex, year = selectedYear) => {
        // Valor atual
        const monthlyTotals = calculateMonthlyTotals();
        const current = monthlyTotals[monthIndex];

        // Descobrir mês e ano anterior
        let prevMonth = monthIndex - 1;
        let prevYear = year;
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear = year - 1;
        }

        // Para ano anterior, recalcule os totais daquele ano
        let previous;
        if (prevYear !== year) {
            // Filtra totalValues para o ano anterior
            const prevYearTotals = months.map((_, idx) => {
                let totalUSD = 0;
                let totalBRL = 0;
                totalValues.forEach(value => {
                    const [y, m] = value.date.split('-');
                    if (
                        Number(m) - 1 === idx &&
                        Number(y) === prevYear
                    ) {
                        totalUSD += parseFloat(value.totalValueInUSD || 0);
                        totalBRL += parseFloat(value.totalValueInBRL || 0);
                    }
                });
                return { totalUSD, totalBRL };
            });
            previous = prevYearTotals[prevMonth];
        } else {
            previous = monthlyTotals[prevMonth];
        }

        if (!current || !previous) return null;

        if (currency === 'USD') {
            return previous.totalUSD && previous.totalUSD !== 0
                ? ((current.totalUSD - previous.totalUSD) / Math.abs(previous.totalUSD)) * 100
                : null;
        } else {
            return previous.totalBRL && previous.totalBRL !== 0
                ? ((current.totalBRL - previous.totalBRL) / Math.abs(previous.totalBRL)) * 100
                : null;
        }
    }

    const fetchDollarRate = async (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        const apiDate = `${year}${month}${day}`;
        const url = `https://economia.awesomeapi.com.br/json/daily/USD-BRL/?start_date=${apiDate}&end_date=${apiDate}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data[0]) {
            setDollarRate(parseFloat(data[0].bid.replace(',', '.')));
        } else {
            setDollarRate(null);
        }
    };

    // Atualiza USD quando BRL muda
    useEffect(() => {
        if (lastChanged === 'BRL' && dollarRate && amountBRL !== '') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setAmountUSD((parseFloat(amountBRL) / parseFloat(dollarRate)).toString());
            }, 1000);
        }
        // eslint-disable-next-line
    }, [amountBRL, dollarRate]);

    // Atualiza BRL quando USD muda
    useEffect(() => {
        if (lastChanged === 'USD' && dollarRate && amountUSD !== '') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setAmountBRL((parseFloat(amountUSD) * parseFloat(dollarRate)).toString());
            }, 1000);
        }
        // eslint-disable-next-line
    }, [amountUSD, dollarRate]);

    return (
        <>
            {isAddingTotalValue ?
                <div className='broker-add-total-container'>
                    <div className='broker-container'>
                        <h2 className='broker-tittle'>Brokers</h2>
                        {isAddingBroker ? null :
                            <CloseIcon className='broker-close-icon' onClick={() => {
                                setIsAddingTotalValue(false);
                                setIsAddingBroker(false);
                                setSelectedBroker(null);
                                setAmountBRL('');
                                setAmountUSD('');
                                setDollarRate(null);
                                setSelectedDate('');
                            }} />
                        }

                        {isAddingBroker ?
                            <div className='broker-add-container'>
                                <div className='broker-add-icon-container'>
                                    <CloseIcon className='broker-close-icon'
                                        onClick={() => {
                                            setIsAddingBroker(false)
                                            setCurrencySearch('')
                                        }}
                                    />
                                </div>

                                <div className='broker-add-form'>
                                    <input
                                        className='broker-input'
                                        type="text"
                                        value={newBrokerName}
                                        onChange={(e) => setNewBrokerName(e.target.value)}
                                        placeholder="Broker Name"
                                    />
                                    {/* Autocomplete de moeda */}
                                    <div className="currency-autocomplete-wrapper">
                                        <input
                                            className='currency-autocomplete-input'
                                            type="text"
                                            value={currencySearch || ''}
                                            onChange={e => {
                                                setCurrencySearch(e.target.value);
                                                setNewBrokerCurrency(e.target.value);
                                                setIsSearchingCurrency(true)
                                            }}
                                            placeholder="Currency"
                                            autoComplete="off"
                                        />
                                        {isSearchingCurrency ?
                                            (currencySearch && filteredCurrencies.length > 0 && (
                                                <ul className="currency-autocomplete-list">
                                                    {filteredCurrencies.map((currency, idx) => (
                                                        <li
                                                            key={idx}
                                                            className="currency-autocomplete-item"
                                                            onClick={() => {
                                                                setNewBrokerCurrency(currency.code);
                                                                setCurrencySearch(currency.code);
                                                                setIsSearchingCurrency(false);
                                                            }}
                                                        >
                                                            {currency.code} - {currency.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ))
                                            : null
                                        }

                                    </div>
                                    <button className='broker-button' onClick={handleAddBroker}>Add Broker</button>
                                </div>
                            </div>
                            : null
                        }

                        <div>
                            <label className='broker-label' htmlFor="brokerSelect">Select a Broker:</label>
                            <select
                                className='broker-select-broker'
                                id="brokerSelect"
                                onChange={(e) => {
                                    if (e.target.value === "Add New Broker") {
                                        setIsAddingBroker(true);
                                        setSelectedBroker(null);
                                        setNewBrokerName('');
                                        setNewBrokerCurrency('');
                                    } else {
                                        handleSelectBroker(e);
                                        setIsAddingBroker(false);
                                    }
                                }}
                            >
                                <option className='broker-option' value="">-- Select --</option>
                                {brokers.map((broker, index) => (
                                    <option key={index} value={broker.broker}>
                                        {broker.broker} ({broker.currency})
                                    </option>
                                ))}
                                <option className='broker-option' value="Add New Broker">Add New Broker</option>
                            </select>
                        </div>
                        <form onSubmit={handleAddTotalValue} className='broker-form'>
                            <div className='broker-date-container'>
                                {selectedDate && (
                                    <span style={{ fontSize: '1em', color: '#444' }}>{selectedDate}</span>
                                )}
                                <DateIcon
                                    className='broker-date-icon'
                                    onClick={() => {
                                        const dateInput = document.getElementById('dateInput');
                                        if (dateInput) dateInput.showPicker();
                                    }}
                                />

                                <input
                                    id="dateInput"
                                    className='broker-input-data'
                                    type="date"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value);
                                        fetchDollarRate(e.target.value);
                                    }}
                                />
                            </div>
                            <div className='broker-amount-container'>
                                <input
                                    className='broker-input-total'
                                    type="number"
                                    placeholder="Total Amount"
                                    value={amountUSD}
                                    onChange={e => {
                                        setAmountUSD(e.target.value);
                                        setLastChanged('USD');
                                    }}
                                />
                                {selectedBroker ?
                                    <p>USD</p>
                                    : null
                                }
                            </div>

                            {dollarRate && (
                                <div style={{ color: '#3182ce' }}>
                                    USD/BRL: R$ {parseFloat(dollarRate).toFixed(4)}
                                </div>
                            )}

                            <div className='broker-amount-container'>
                                <input
                                    className='broker-input-total'
                                    type="number"
                                    placeholder="Total Amount"
                                    value={amountBRL}
                                    onChange={e => {
                                        setAmountBRL(e.target.value);
                                        setLastChanged('BRL');
                                    }}
                                />
                                {selectedBroker ?
                                    <p>BRL</p>
                                    : null
                                }
                            </div>
                            <button className='broker-button-value' type="submit">Add Total Value</button>

                        </form>
                    </div>
                </div>
                : null
            }

            <div className='year-selector' style={{ marginTop: '20px' }}>
                <label className='year-select' style={{ border: 0 }} htmlFor="yearSelect">Select Year:</label>
                <select
                    className='year-select'
                    id="yearSelect"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                    {availableYears.map((year, index) => (
                        <option key={index} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>

            <div className='broker-header'>
                <h2 className='broker-tittle'>Monthly Totals</h2>
                <SearchIcon className='broker-search-icon' onClick={() => setIsSearchingTotalValue(true)} />
                <AddIcon className='broker-add-icon' onClick={() => setIsAddingTotalValue(true)} />
            </div>

            {isSearchingTotalValue ?
                <div className='total-value-search'>
                    <CloseIcon className='broker-close-icon' onClick={() => {
                        setIsSearchingTotalValue(false)
                        setSearchBroker('');
                        setSearchMonth('');
                    }
                    }
                    />
                    <div className='total-value-search-filters'>
                        <label htmlFor="searchBroker">Broker:</label>
                        <select
                            id="searchBroker"
                            value={searchBroker}
                            onChange={e => setSearchBroker(e.target.value)}
                        >
                            <option value="">--</option>
                            {uniqueBrokers.map((broker, idx) => (
                                <option key={idx} value={broker}>{broker}</option>
                            ))}
                        </select>
                        <label htmlFor="searchMonth" style={{ marginLeft: 10 }}>Month:</label>
                        <select
                            id="searchMonth"
                            value={searchMonth}
                            onChange={e => setSearchMonth(e.target.value)}
                        >
                            <option value="">--</option>
                            {uniqueMonths.map(m => (
                                <option key={m} value={m}>{months[m - 1]}</option>
                            ))}
                        </select>
                    </div>

                    <div className='broker-search-results'>
                        {(searchBroker && searchMonth && filteredTotalValues.length > 0) ? (
                            <ul>
                                {filteredTotalValues.map((value, index) => (
                                    <li key={index}>
                                        <DeleteIcon className='broker-delete-icon' onClick={() => handleDeleteTotalValue(value)} />
                                        <p className='broker-search-item'>
                                            {value.broker.broker} - {months[Number(value.date.split('-')[1]) - 1]}
                                        </p>
                                        <p className='broker-search-amounts'>
                                            {formatNumber(value.totalValueInUSD)} USD
                                            <br />
                                            {formatNumber(value.totalValueInBRL)} BRL
                                        </p>
                                        
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </div>
                : null
            }



            {totalValues ?
                <div className='broker-table-wrapper'>
                    <table className='broker-table'>
                        <thead>
                            <tr>
                                <th>Broker</th>
                                {months.map((month, index) => (
                                    <React.Fragment key={index}>
                                        <th>{month}</th>
                                        <th>%</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {brokers
                                .filter(broker => {
                                    // Verifica se o broker tem algum valor no ano selecionado
                                    return totalValues.some(value => {
                                        if (!value.date) return false;
                                        const [year] = value.date.split('-');
                                        return value.broker.broker === broker.broker && Number(year) === selectedYear && (
                                            parseFloat(value.totalValueInUSD || 0) > 0 ||
                                            parseFloat(value.totalValueInBRL || 0) > 0
                                        );
                                    });
                                })
                                .map((broker, brokerIndex) => (
                                    <React.Fragment key={brokerIndex}>
                                        <tr>
                                            <td className='broker-name'>{broker.broker}</td>
                                        </tr>
                                        <tr>
                                            <td>USD</td>
                                            {months.map((_, monthIndex) => {
                                                const { totalUSD } = getBrokerMonthlyTotals(broker.broker, monthIndex);
                                                const valorization = getValorization(broker.broker, monthIndex);
                                                const color = valorization && valorization.valorizationUSD !== null
                                                    ? valorization.valorizationUSD < 0 ? '#e53e3e' : '#3182ce'
                                                    : '#3182ce';
                                                return (
                                                    <React.Fragment key={monthIndex}>
                                                        <td>{formatNumber(totalUSD)}</td>
                                                        <td style={{ fontSize: '0.95em', color: color }}>
                                                            {valorization && valorization.valorizationUSD !== null
                                                                ? `${valorization.valorizationUSD.toFixed(2)}%`
                                                                : '--'}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                        <tr>
                                            <td>BRL</td>
                                            {months.map((_, monthIndex) => {
                                                const { totalBRL } = getBrokerMonthlyTotals(broker.broker, monthIndex);
                                                const valorization = getValorization(broker.broker, monthIndex);
                                                const color = valorization && valorization.valorizationBRL !== null
                                                    ? valorization.valorizationBRL < 0 ? '#e53e3e' : '#3182ce'
                                                    : '#3182ce';
                                                return (
                                                    <React.Fragment key={monthIndex}>
                                                        <td>{formatNumber(totalBRL)}</td>

                                                        <td style={{ fontSize: '0.95em', color: color }}>
                                                            {valorization && valorization.valorizationBRL !== null
                                                                ? `${valorization.valorizationBRL.toFixed(2)}%`
                                                                : '--'}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>

                                    </React.Fragment>
                                ))}
                            <tr className='total-row'>
                                <td>Total USD</td>
                                {calculateMonthlyTotals().map((totals, monthIndex) => {
                                    const valorization = getTotalValorization('USD', monthIndex);
                                    const color = valorization !== null
                                        ? valorization < 0 ? '#e53e3e' : '#3182ce'
                                        : '#3182ce';
                                    return (
                                        <React.Fragment key={monthIndex}>
                                            <td>{formatNumber(totals.totalUSD)}</td>
                                            <td style={{ fontSize: '0.95em', color }}>
                                                {valorization !== null
                                                    ? `${valorization.toFixed(2)}%`
                                                    : '--'}
                                            </td>
                                        </React.Fragment>
                                    )
                                })}
                            </tr>
                            <tr className='total-row'>
                                <td>Total BRL</td>
                                {calculateMonthlyTotals().map((totals, monthIndex) => {
                                    const valorization = getTotalValorization('BRL', monthIndex);
                                    const color = valorization !== null
                                        ? valorization < 0 ? '#e53e3e' : '#3182ce'
                                        : '#3182ce';
                                    return (
                                        <React.Fragment key={monthIndex}>
                                            <td>{formatNumber(totals.totalBRL)}</td>
                                            <td style={{ fontSize: '0.95em', color }}>
                                                {valorization !== null
                                                    ? `${valorization.toFixed(2)}%`
                                                    : '--'}
                                            </td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
                : <p className='broker-no-data'>Loading...</p>}

            <h2 className='footer'>Yield Management</h2>
        </>
    );
};

export default Brokers;