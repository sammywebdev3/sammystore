'use client';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light') {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button 
      onClick={toggleTheme} 
      className="p-2 rounded-lg bg-[#1a1a25] hover:bg-[#2a2a3a] border border-[#2a2a3a] transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <span className="text-[#ffd700] text-xl">☀️</span>
      ) : (
        <span className="text-[#00f5ff] text-xl"></span>
      )}
    </button>
  );
}
