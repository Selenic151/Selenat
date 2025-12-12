export const emitToast = (type, message, options = {}) => {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { type, message, options } }));
};

export const toastSuccess = (message, options) => emitToast('success', message, options);
export const toastError = (message, options) => emitToast('error', message, options);
export const toastInfo = (message, options) => emitToast('info', message, options);
