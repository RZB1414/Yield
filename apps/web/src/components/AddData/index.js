import './AddData.css';
import { useState, useEffect } from 'react';
import { createCardTransaction, getAllCreditCards } from '../../services/creditCards';
import { readFile } from '../../services/dividends';
import { saveBtgDividends } from '../../services/btgDividends';
import { loginUser } from '../../services/login';
import { ReactComponent as CloseIcon } from '../../assets/icons/close-icon.svg';


    // Função para hashear a senha igual ao login principal
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

const AddData = ({ setRefresh }) => {
    const [bank, setBank] = useState('');
    const [bankOptions, setBankOptions] = useState([]);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [isAddingNewBank, setIsAddingNewBank] = useState(false);
    const [newBankCurrency, setNewBankCurrency] = useState('');
    const [date, setDate] = useState('');
    const [currency, setCurrency] = useState('');
    const [value, setValue] = useState('');
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [isAddingDividends, setIsAddingDividends] = useState(false);
    const [fileName, setFileName] = useState('Select a file')
    const [selectedFile, setSelectedFile] = useState(null)
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [fileType, setFileType] = useState('pc'); // only used for XP
    const [dividendsPassword, setDividendsPassword] = useState('');
    const [dividendsEmail, setDividendsEmail] = useState('');
    const [showDividendsPassword, setShowDividendsPassword] = useState(false);
    const [broker, setBroker] = useState(''); // agora inicia sem broker definido

    // Adapte para receber userId como prop se necessário
    const userId = sessionStorage.getItem('userId')

    // Carrega bancos já salvos ao abrir o modal de cartão
    useEffect(() => {
        if (isAddingCard) {
            const fetchBanks = async () => {
                try {
                    const data = await getAllCreditCards(userId);

                    const uniqueBanks = [...new Set(data.map(b => b.bank))];
                    setBankOptions(uniqueBanks);
                    const uniqueCurrencies = [...new Set(data.map(b => b.currency))];
                    setCurrencyOptions(uniqueCurrencies);
                } catch (error) {
                    setBankOptions([]);
                }
            };
            fetchBanks();
        }
    }, [isAddingCard, userId]);

    // Reset file inputs when broker changes
    useEffect(() => {
        setSelectedFile(null);
        setFileName('Select a file');
        // Keep fileType only if broker is XP
        if (broker !== 'XP') {
            setFileType('pc');
            // Limpa credenciais quando muda para BTG ou nenhum
            setDividendsEmail('');
            setDividendsPassword('');
        }
    }, [broker]);

    const handleSubmit = async (e) => {
        e.preventDefault();


        let bankName = bank;
        let currencyName = currency === '__new__' ? newBankCurrency : currency;

        const transaction = {
            bank: bankName,
            date,
            currency: currencyName,
            value: parseFloat(value),
            userId
        };

        try {
            await createCardTransaction(transaction);
            alert('Card transaction created!');
            setIsAddingCard(false);
            setBank('');
            setDate('');
            setCurrency('');
            setValue('');
            setIsAddingNewBank(false);
            setNewBankCurrency('');
            setRefresh && setRefresh(prev => prev + 1);
        } catch (error) {
            console.error('Error creating transaction:', error);
            alert(error?.response?.data?.msg || 'Failed to create transaction.');
        }
    }

    const handleFileChange = (event) => {
        const file = event.target.files[0]; // Obtém o arquivo selecionado
        if (!file) {
            setFileName('Select a file');
            setSelectedFile(null);
            return;
        }

        setFileName(file.name); // Atualiza o nome do arquivo selecionado
        setSelectedFile(file); // Armazena o arquivo no estado
    };

    const handleFileUpload = async () => {
        if (!selectedFile) { alert('Please select a file first.'); return; }
        if (!broker) { alert('Selecione o broker.'); return; }
        // Fluxo XP exige email e senha + login
        if (broker === 'XP') {
            if (!dividendsEmail) { alert('Please enter your email.'); return; }
            if (!dividendsPassword) { alert('Please enter your password.'); return; }
        }
        setIsUploadingFile(true);

        let result;
        try {
            if (broker === 'BTG') {
                // Sem login nem criptografia local para BTG
                result = await saveBtgDividends(selectedFile);
            } else {
                // XP: autentica + criptografa
                const hashedPassword = await hashPassword(dividendsPassword);
                let loginOk = false;
                try { await loginUser({ email: dividendsEmail, password: hashedPassword }); loginOk = true; } catch (e) { setIsUploadingFile(false); alert('Email ou senha incorretos.'); return; }
                if (!loginOk) { setIsUploadingFile(false); return; }
                result = await readFile(selectedFile, fileType, dividendsPassword);
            }
            setRefresh(prev => prev + 1);
            setIsAddingDividends(false);
            setFileName('Select a file');
            setSelectedFile(null);
            setDividendsPassword('');
            setDividendsEmail('');
            const msg = (result && typeof result === 'object')
                ? `${result.message ? result.message + '\n' : ''}` +
                  (result.duplicated !== undefined ? `Duplicated: ${result.duplicated}\n` : '') +
                  (result.inserted !== undefined ? `Inserted: ${result.inserted}` : '')
                : String(result || 'Operação concluída');
            alert(msg || 'Operação concluída');
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload and process the file.');
        } finally {
            setIsUploadingFile(false);
        }
    };

    return (
        <div className="add-data-container">
            {isAddingDividends ? null :
                <h2 onClick={() => setIsAddingCard(true)}>New Credit Card Transaction</h2>
            }
            {isAddingCard ? (
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <CloseIcon className='close-card-icon' onClick={() => setIsAddingCard(false)} />
                        <label htmlFor="bank">Bank:</label>
                        {isAddingNewBank ? (
                            <>
                                <input
                                    type="text"
                                    className="bank-input"
                                    placeholder="Enter new bank name"
                                    value={bank}
                                    onChange={e => setBank(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <input
                                    type="text"
                                    className="bank-input"
                                    placeholder="Currency (ex: BRL, USD)"
                                    value={newBankCurrency}
                                    onChange={e => setNewBankCurrency(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => {
                                    setBank('');
                                    setIsAddingNewBank(false);
                                    setNewBankCurrency('');
                                }}>Cancel</button>
                            </>
                        ) : (
                            <select
                                id="bank"
                                className="bank-select"
                                value={bank}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        setIsAddingNewBank(true);
                                        setBank('');
                                    } else {
                                        setBank(e.target.value);
                                        setIsAddingNewBank(false);
                                    }
                                }}
                                required
                            >
                                <option value="">Select bank</option>
                                {bankOptions.map((b, idx) => (
                                    <option key={idx} value={b}>{b}</option>
                                ))}
                                <option value="__new__">Add New Bank</option>
                            </select>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="date">Date:</label>
                        <input
                            type="date"
                            id="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="currency">Currency:</label>
                        {currency === '__new__' ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    className="currency-input"
                                    placeholder="Enter new currency (ex: BRL, USD)"
                                    value={newBankCurrency}
                                    onChange={e => setNewBankCurrency(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => {
                                    setCurrency('');
                                    setNewBankCurrency('');
                                }}>Cancel</button>
                            </div>
                        ) : (
                            <select
                                id="currency"
                                className="currency-select"
                                value={currency}
                                onChange={e => {
                                    if (e.target.value === '__new__') {
                                        setCurrency('__new__');
                                        setNewBankCurrency('');
                                    } else {
                                        setCurrency(e.target.value);
                                    }
                                }}
                                required
                            >
                                <option value="">Select currency</option>
                                {currencyOptions.map((c, idx) => (
                                    <option key={idx} value={c}>{c}</option>
                                ))}
                                <option value="__new__">Add New Currency</option>
                            </select>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="value">Value:</label>
                        <input
                            className='value-input'
                            type="number"
                            id="value"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Insert value"
                            step="0.01"
                            required
                        />
                    </div>
                    <button className='add-transaction-button' type="submit">Add Transaction</button>
                </form>
            )
                : null
            }

            {isAddingCard ? null
                :
                <div>
                    <h2 onClick={() => setIsAddingDividends(true)}>Add New Dividends File</h2>
                </div>
            }


            {isAddingDividends ? (!isUploadingFile ? (
                <div className="file-upload-container">
                    {/* ...existing close button ... */}
                    <div className="file-upload-closebutton">
                        <CloseIcon className='close-card-icon' onClick={() => { setIsAddingDividends(false); setSelectedFile(null); setFileName('Select a file'); setDividendsPassword(''); setDividendsEmail(''); }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label htmlFor="broker-select" className='broker-select-name' style={{ marginRight: 8 }}>Broker:</label>
                        <select id="broker-select" className='broker-select-add' value={broker} onChange={e => setBroker(e.target.value)} style={{ padding: 4 }}>
                            <option value="" disabled>Select</option>
                            <option value="XP">XP</option>
                            <option value="BTG">BTG</option>
                        </select>
                    </div>
                    {broker === 'XP' && (
                        <div style={{ marginBottom: 12 }}>
                            <label htmlFor="file-type-select" style={{ marginRight: 8 }}>File type:</label>
                            <select id="file-type-select" value={fileType} onChange={e => setFileType(e.target.value)} style={{ padding: 4 }}>
                                <option value="pc">PC</option>
                                <option value="mobile">Mobile</option>
                            </select>
                        </div>
                    )}
                    <label htmlFor="file-upload" className="file-upload-label">
                        {fileName}
                    </label>
                    <input
                        type="file"
                        id="file-upload"
                        accept={broker === 'BTG' ? 'application/pdf,.pdf' : '.xlsx, .xls'}
                        onChange={handleFileChange}
                        className="file-upload-input"
                        disabled={!broker}
                    />
                    {broker === 'XP' && (
                        <>
                            <input
                                type="email"
                                placeholder="Seu email"
                                value={dividendsEmail}
                                onChange={e => setDividendsEmail(e.target.value)}
                                className="file-upload-password-input"
                                autoComplete="username"
                            />
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type={showDividendsPassword ? 'text' : 'password'}
                                    placeholder="Sua senha para criptografar"
                                    value={dividendsPassword}
                                    onChange={e => setDividendsPassword(e.target.value)}
                                    className="file-upload-password-input"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    style={{
                                        position: 'absolute',
                                        right: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                    onClick={() => setShowDividendsPassword(v => !v)}
                                    tabIndex={-1}
                                    aria-label={showDividendsPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {showDividendsPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </>
                    )}
                    <button
                        className="upload-file-button"
                        onClick={handleFileUpload}
                        disabled={!selectedFile || !broker || (broker === 'XP' && (!dividendsEmail || !dividendsPassword))}
                    >
                        Upload File
                    </button>
                </div>
            ) : (
                <div className="loader-container">
                    <div className="loader-message">{broker === 'BTG' ? 'Processing PDF...' : 'Encrypting your data...'}</div>
                    <div className="loader"></div>
                </div>
            )) : null}
        </div>
    );
};

export default AddData;