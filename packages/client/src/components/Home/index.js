import { useState } from 'react'
import { LoginForm } from '../Connect'
import './Home.css'
import Logon from '../Logon'

// Página de autenticação unificada (Login / Sign Up)
const Home = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false)

    return (
        <div className="auth-page">
            <h1 className="app-brand">Yield Management</h1>
            <div className="auth-card-wrapper">
                {isSignUp ? (
                    <Logon onCreate={() => setIsSignUp(false)} />
                ) : (
                    <LoginForm onLogin={onLogin} />
                )}
            </div>
            <div className="auth-toggle">
                {isSignUp ? (
                    <span>Já tem uma conta? <button className="link-button" onClick={() => setIsSignUp(false)}>Log In</button></span>
                ) : (
                    <span>Don't have an account? <button className="link-button" onClick={() => setIsSignUp(true)}>Sign Up</button></span>
                )}
            </div>
        </div>
    )
}

export default Home