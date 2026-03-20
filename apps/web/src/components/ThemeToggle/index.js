import React, { useEffect, useState } from 'react';
import './ThemeToggle.css';
import { ReactComponent as DarkModeIcon } from '../../assets/icons/dark-mode-icon.svg';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggle = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <DarkModeIcon
      className="theme-toggle-btn"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      type="button"
    >
      <DarkModeIcon className={`theme-icon ${theme}`} />
    </DarkModeIcon>
  );
}
