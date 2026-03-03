import React, { useState } from "react"
import './Logon.css'
import { createUser } from "../../services/login"
import userIcon from '../../assets/icons/user-icon.svg';
import emailIcon from '../../assets/icons/email-icon.svg';
import lockIcon from '../../assets/icons/lock-icon.svg';

const Logon = ({ onCreate }) => {
  const [form, setForm] = useState({ userName: "", email: "", password: "" })
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
    try {
      // Faz o hash da senha antes de enviar
      const hashedPassword = await hashPassword(form.password);
      const userData = {
        userName: form.userName,
        email: form.email,
        password: hashedPassword
      };
      await createUser(userData);
      if (onCreate) onCreate(userData);
      setMessage("Usuário criado com sucesso!");
      setForm({ userName: "", email: "", password: "" });
    } catch (error) {
      setMessage("Erro ao criar usuário.");
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-title">Sign Up</h2>
      <div className="field-group">
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden>
            <img src={userIcon} alt="" width={20} height={20} loading="lazy" />
          </span>
          <input
            className="text-input"
            name="userName"
            placeholder="Name"
            value={form.userName}
            onChange={handleChange}
            required
          />
        </div>
      </div>
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
      <button className="primary-button" type="submit">Create Account</button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
};

export default Logon;