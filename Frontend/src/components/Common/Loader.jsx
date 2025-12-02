const Loader = ({ size = 'medium', text = 'Đang tải...' }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin`}
          style={{
            background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #3b82f6)',
            borderRadius: '50%',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))'
          }}
        ></div>
        <div className={`${sizeClasses[size]} border-4 border-transparent rounded-full absolute top-0 left-0 animate-pulse bg-gradient-to-r from-blue-500/20 to-purple-500/20`}></div>
      </div>
      {text && <p className="mt-4 text-gray-600 font-medium">{text}</p>}
    </div>
  );
};

export default Loader;

// Loader với full screen
export const FullScreenLoader = ({ text = 'Đang tải...' }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-blue-50 to-purple-50 bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200">
        <Loader size="large" text={text} />
      </div>
    </div>
  );
};

// Loader inline (cho nút button)
export const ButtonLoader = () => {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white inline-block"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};