import React from 'react';

const DarkModeToggle = ({ darkMode, toggleDarkMode }) => {
  return (
    <button
      onClick={toggleDarkMode}
      className="fixed top-4 right-4 p-3 rounded-full bg-emerald-900 dark:bg-emerald-700 hover:bg-emerald-800 dark:hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-900/30 dark:shadow-emerald-800/30 group"
      aria-label="Toggle dark mode"
    >
      <div className="relative w-6 h-6 flex items-center justify-center overflow-hidden">
        {/* Moon (Dark Mode) */}
        <svg
          className={`absolute w-5 h-5 text-emerald-300 transition-all duration-300 ease-out ${
            darkMode 
              ? 'rotate-0 opacity-100 scale-100' 
              : 'rotate-90 opacity-0 scale-0'
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>

        {/* Sun (Light Mode) */}
        <svg
          className={`absolute w-6 h-6 text-amber-300 transition-all duration-300 ease-out ${
            darkMode 
              ? 'rotate-90 opacity-0 scale-0' 
              : 'rotate-0 opacity-100 scale-100'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </div>
    </button>
  );
};

export default DarkModeToggle;