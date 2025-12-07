import React from 'react';

const ChatHeader = ({ room, darkMode, getRoomDisplayName, onToggleTheme, onShowSidebar }) => {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b transition-all duration-300 ${
      darkMode 
        ? 'border-orange-800 bg-orange-900 shadow-lg' 
        : 'border-orange-200 bg-orange-100 shadow-lg'
    }`}>
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center avatar-hover ${
          darkMode ? 'bg-orange-800' : 'bg-orange-200'
        }`}>
          <svg className={`w-5 h-5 ${darkMode ? 'text-orange-300' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h2 className={`text-lg font-bold transition-colors duration-300 ${
            darkMode ? 'text-orange-100' : 'text-orange-900'
          }`}>{getRoomDisplayName()}</h2>
          <p className={`text-sm transition-colors duration-300 ${
            darkMode ? 'text-orange-300' : 'text-orange-500'
          }`}>{room.members?.length || 0} thành viên</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleTheme} 
          className={`p-3 rounded-xl transition-all duration-300 btn-hover-lift ${
            darkMode 
              ? 'hover:bg-orange-800 text-orange-300 hover:text-yellow-400' 
              : 'hover:bg-orange-100 text-orange-600 hover:text-orange-700'
          }`} 
          title="Toggle dark mode"
        >
          <div className="relative">
            {darkMode ? (
              <svg className="w-5 h-5 animate-fade-in-up" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 animate-fade-in-up" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </div>
        </button>
        <button 
          onClick={onShowSidebar} 
          className={`p-3 rounded-xl transition-all duration-300 btn-hover-lift ${
            darkMode 
              ? 'hover:bg-orange-800 text-orange-300 hover:text-orange-100' 
              : 'hover:bg-orange-100 text-orange-600 hover:text-orange-900'
          }`} 
          title="Xem thành viên"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
