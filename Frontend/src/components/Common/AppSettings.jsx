import React, { useState, useEffect } from 'react';
import { useThemeContext } from '../../context/ThemeContextStore';

const AppSettings = ({ onClose }) => {
  const { darkMode, toggleTheme, colorTheme, changeColorTheme, colorPalettes } = useThemeContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('enableNotifications');
      return saved === null ? true : saved === 'true';
    } catch (e) {
      console.error(e);
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('enableNotifications', notificationsEnabled);
    } catch (e) {
      console.error(e);
    }
  }, [notificationsEnabled]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cài đặt ứng dụng</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100">Chế độ tối</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">Bật/Tắt giao diện tối</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="hidden" checked={darkMode} onChange={toggleTheme} />
              <span className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 ${darkMode ? 'bg-orange-500' : ''}`}>
                <span className={`bg-white w-4 h-4 rounded-full shadow transform ${darkMode ? 'translate-x-6' : ''}`} />
              </span>
            </label>
          </div>

          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">Màu chủ đạo</p>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-2">Chọn màu chính của giao diện</p>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(colorPalettes).map((key) => (
                <button
                  key={key}
                  onClick={() => changeColorTheme(key)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ring-2 ${colorTheme === key ? 'ring-orange-400' : 'ring-transparent'}`}
                  title={colorPalettes[key].name}
                >
                  <div
                    className="w-8 h-8 rounded-md"
                    style={{ backgroundColor: colorPalettes[key].primaryHex }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100">Thông báo</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">Nhận thông báo mới</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="hidden"
                checked={notificationsEnabled}
                onChange={() => setNotificationsEnabled(prev => !prev)}
              />
              <span className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 ${notificationsEnabled ? 'bg-orange-500' : ''}`}>
                <span className={`bg-white w-4 h-4 rounded-full shadow transform ${notificationsEnabled ? 'translate-x-6' : ''}`} />
              </span>
            </label>
          </div>

          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-md">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
