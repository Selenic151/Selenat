import { createContext, useState, useEffect, useContext } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
const colorPalettes = {
  orange: {
    name: 'Cam',
    primary: 'bg-orange-500',
    secondary: 'bg-orange-100',
    text: 'text-orange-900',
  },
  blue: {
    name: 'Xanh',
    primary: 'bg-blue-500',
    secondary: 'bg-blue-100',
    text: 'text-blue-900',
  },
  green: {
    name: 'Xanh lá',
    primary: 'bg-green-500',
    secondary: 'bg-green-100',
    text: 'text-green-900',
  },
  purple: {
    name: 'Tím',
    primary: 'bg-purple-500',
    secondary: 'bg-purple-100',
    text: 'text-purple-900',
  },
};

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [colorTheme, setColorTheme] = useState(() => {
    const saved = localStorage.getItem('colorTheme');
    return saved || 'orange';
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-gray-950', 'text-gray-100');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-gray-950', 'text-gray-100');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => setDarkMode(prev => !prev);
  const changeColorTheme = (theme) => setColorTheme(theme);

  return (
    <ThemeContext.Provider value={{
      darkMode,
      toggleTheme,
      colorTheme,
      changeColorTheme,
      palette: colorPalettes[colorTheme],
      colorPalettes,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
