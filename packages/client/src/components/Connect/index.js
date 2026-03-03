import { getAllDividends } from "../../services/dividends"
import { getStocksList, stockData } from "../../services/stocks"
import './Connect.css';
import { getCurrentUser, loginUser } from '../../services/login'
import { useState } from 'react';
import { getBtgDividends } from "../../services/btgDividends";
import emailIcon from '../../assets/icons/email-icon.svg';
import lockIcon from '../../assets/icons/lock-icon.svg';

let filteredDividends = [];
let dividends = [];
let btgDividends = [];
let btgTransactions = [];
let stocks = [];
let updated = [];
let decryptedDividends = [];
let password = '';

const fetchDividendsStocks = async () => {
    const userId = sessionStorage.getItem('userId')
    stocks = [];
    updated = [];
    dividends = [];
    filteredDividends = [];
    decryptedDividends = [];
    try {
        stocks = await getStocksList(userId);
        
        updated = await Promise.all(
            stocks.map(async (stock) => {             
                const stockDataResult = await stockData(stock.symbol)             
                
                return {
                    ...stock,
                    currentPrice: stockDataResult["stock info: "]?.currentPrice ?? 0,
                    dayPriceChangePercent: stockDataResult["stock info: "]?.dayPriceChangePercent ?? 0
                };
            })
        )
        
        const passwordKey = password
        const allDividends = await getAllDividends(userId, passwordKey)
        if (allDividends && allDividends.unfilteredDividends) {

            const includedDividends = [
                "NOTA",
                "RENDIMENTO RENDA FIXA",
                "CARTAO DE CREDITO",
                "CASHBACK CARTAO",
            ];


            filteredDividends = allDividends.unfilteredDividends.filter(
                dividend => includedDividends.includes(dividend.ticker)
            )

            dividends = allDividends
            
        }

        const btgResponse = await getBtgDividends(userId)
        if (btgResponse && Array.isArray(btgResponse.dividends) && (btgResponse.dividends.length || btgResponse.transactions.length) > 0) {
            btgDividends = btgResponse.dividends
            btgTransactions = btgResponse.transactions
        } else {
            console.warn('No BTG dividends available');
            btgDividends = []
            btgTransactions = []
        }
    } catch (error) {
        console.error('Error fetching Data:', error);
    }
}

const LoginForm = ({ onLogin }) => {
    const [form, setForm] = useState({ email: "", password: "" });
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            setMessage("Preencha todos os campos.");
            return;
        }
        try {
            // Hash da senha antes de enviar
            const hashedPassword = await hashPassword(form.password);
            const loginData = {
                email: form.email,
                password: hashedPassword
            };
            const response = await loginUser(loginData);
            // Aguarda o token ser salvo
            const token = sessionStorage.getItem('accessToken');
            if (token) {
                try {
                    const userData = await getCurrentUser();
                    if (userData && userData.id) {
                        sessionStorage.setItem('userId', userData.id);
                    }
                } catch (e) {
                    // Se não conseguir obter o userId, continue sem ele
                }
                password = form.password; // Armazenar a senha em uma variável global
                setMessage("Login realizado com sucesso!");
                if (onLogin) onLogin(response);
                setForm({ email: "", password: "" });
            } else {
                setMessage("Erro ao salvar token de autenticação.");
            }
        } catch (error) {
            setMessage("Erro ao fazer login. Verifique suas credenciais.");
        }
    };

    return (
        <form className="auth-form" onSubmit={handleSubmit}>
            <h2 className="auth-title">Log In</h2>
            <div className="field-group">
                <div className="input-wrapper">
                    <span className="input-icon" aria-hidden>
                        <img src={emailIcon} alt="" width={20} height={20} loading="lazy" />
                    </span>
                    <input
                        className="text-input"
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>
            <div className="field-group">
                <div className="input-wrapper">
                    <span className="input-icon" aria-hidden>
                        <img src={lockIcon} alt="" width={20} height={20} loading="lazy" />
                    </span>
                    <input
                        className="text-input"
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>
            <div className="form-extras">
                <button type="button" className="forgot-link">Forgot Password?</button>
            </div>
            <button className="primary-button" type="submit">Log In</button>
            {message && <p className="form-message">{message}</p>}
        </form>
    );
};

export { fetchDividendsStocks, LoginForm, filteredDividends, dividends, stocks, updated, decryptedDividends, btgDividends, btgTransactions }