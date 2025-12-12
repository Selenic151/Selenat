import React from 'react';

const ConfirmModal = ({ open, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 rounded-xl shadow-2xl bg-white dark:bg-gray-900 p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
