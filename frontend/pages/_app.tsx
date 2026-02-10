import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useState, useEffect, createContext, useContext } from 'react';

// Create a context for dark mode to share across components
interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const DarkModeContext = createContext<DarkModeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export const useDarkMode = () => useContext(DarkModeContext);

export default function App({ Component, pageProps }: AppProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Listen for dark mode changes from other components
  useEffect(() => {
    const handleDarkModeChange = () => {
      const isDark = localStorage.getItem('darkMode') === 'true';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    window.addEventListener('darkModeChanged', handleDarkModeChange);
    window.addEventListener('storage', handleDarkModeChange);
    
    return () => {
      window.removeEventListener('darkModeChanged', handleDarkModeChange);
      window.removeEventListener('storage', handleDarkModeChange);
    };
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Notify other components
    window.dispatchEvent(new Event('darkModeChanged'));
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <Component {...pageProps} />;
  }

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <Component {...pageProps} />
    </DarkModeContext.Provider>
  );
}