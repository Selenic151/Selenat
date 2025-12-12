import React, { useState } from 'react';

const getServerURL = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api$/, '');
};

const Avatar = ({ avatar, username, size = 'w-10 h-10', bgClass = '', className = '', alt }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (avatar && !imgFailed) {
    const src = (avatar || '').toString();
    const resolved = src.startsWith('http') || src.startsWith('data:') ? src : `${getServerURL()}${src}`;
    return (
      <img
        src={resolved}
        alt={alt || username || 'avatar'}
        onError={() => setImgFailed(true)}
        className={`${size} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`${size} rounded-full flex items-center justify-center ${bgClass} ${className}`}>
      <span className="text-sm font-semibold text-white">{(username || '?').charAt(0).toUpperCase()}</span>
    </div>
  );
};

export default Avatar;
