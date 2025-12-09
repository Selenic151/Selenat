import { useState, useEffect } from 'react';
import { ThemeContext } from './ThemeContextStore';

// colorPalettes now include hex tokens for CSS variables (design tokens)
const colorPalettes = {
  orange: {
    name: 'Cam',
    // Tailwind utility classes kept for backward compatibility
    primary: 'bg-orange-500',
    secondary: 'bg-orange-100',
    text: 'text-orange-900',
    // Hex tokens used for CSS variables
    primaryHex: '#f97316', // orange-500
    secondaryHex: '#ffedd5', // orange-100
    textHex: '#7c2d12', // orange-900
  },
  blue: {
    name: 'Xanh',
    primary: 'bg-blue-500',
    secondary: 'bg-blue-100',
    text: 'text-blue-900',
    primaryHex: '#3b82f6',
    secondaryHex: '#dbeafe',
    textHex: '#1e3a8a',
  },
  green: {
    name: 'Xanh lá',
    primary: 'bg-green-500',
    secondary: 'bg-green-100',
    text: 'text-green-900',
    primaryHex: '#10b981',
    secondaryHex: '#d1fae5',
    textHex: '#14532d',
  },
  purple: {
    name: 'Tím',
    primary: 'bg-purple-500',
    secondary: 'bg-purple-100',
    text: 'text-purple-900',
    primaryHex: '#8b5cf6',
    secondaryHex: '#ede9fe',
    textHex: '#4c1d95',
  },
};


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

  // Apply CSS variables for the selected color theme so the app can use design tokens
  useEffect(() => {
    try {
      const palette = colorPalettes[colorTheme] || colorPalettes.orange;
      const root = document.documentElement;
      root.style.setProperty('--primary', palette.primaryHex);
      root.style.setProperty('--secondary', palette.secondaryHex);
      root.style.setProperty('--accent-text', palette.textHex);
      // Optional: expose palette hex as well
      root.style.setProperty('--primary-hex', palette.primaryHex);
      // also expose RGB tuples for rgba usages
      const hexToRgb = (hex) => {
        const h = hex.replace('#', '');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r}, ${g}, ${b}`;
      };
      root.style.setProperty('--primary-rgb', hexToRgb(palette.primaryHex));
      root.style.setProperty('--secondary-rgb', hexToRgb(palette.secondaryHex));
      root.style.setProperty('--accent-text-rgb', hexToRgb(palette.textHex));
      // status colors (success / danger / info) - keep defaults but expose vars
      const successHex = palette.successHex || '#10b981';
      const dangerHex = palette.dangerHex || '#ef4444';
      const infoHex = palette.infoHex || '#3b82f6';
      root.style.setProperty('--success', successHex);
      root.style.setProperty('--danger', dangerHex);
      root.style.setProperty('--info', infoHex);
      root.style.setProperty('--success-rgb', hexToRgb(successHex));
      root.style.setProperty('--danger-rgb', hexToRgb(dangerHex));
      root.style.setProperty('--info-rgb', hexToRgb(infoHex));
    } catch {
      // ignore
    }
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

// `ThemeContext` and `useThemeContext` are provided from `ThemeContextStore.js`
