"use client";

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const DarkModeBtn = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('Current theme:', newTheme);
  };

  const buttonStyle: React.CSSProperties = {
    padding: '7px',
    borderRadius: '50%',
    cursor: 'pointer',
    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  };

  return (
    <button onClick={toggleTheme} style={buttonStyle}>
      {theme === 'light' ? <Moon size={21} /> : <Sun size={21} />}
    </button>
  );
};

export default DarkModeBtn;