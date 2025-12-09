import React from 'react';
import { useThemeContext } from '../../context/ThemeContextStore';

const ThemeSelector = () => {
  const { colorTheme, changeColorTheme, colorPalettes } = useThemeContext();
  return (
    <div className="flex gap-3 items-center">
      {Object.entries(colorPalettes).map(([key, palette]) => (
        <button
          key={key}
          onClick={() => changeColorTheme(key)}
          className={`px-4 py-2 rounded-lg font-semibold border transition-all duration-200 ${palette.primary} ${colorTheme === key ? 'ring-2 ring-black' : ''}`}
        >
          {palette.name}
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
