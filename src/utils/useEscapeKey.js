import { useEffect } from 'react';

// Global LIFO modal stack: when Escape is pressed, only the topmost active modal/popup closes.
const modalStack = [];

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
      // Get the topmost active modal handler
      const topCloseHandler = modalStack[modalStack.length - 1];
      if (typeof topCloseHandler === 'function') {
        topCloseHandler(e);
      }
    }
  });
}

/**
 * Registers a modal close handler to the global Escape key listener.
 * Automatically respects modal layering (LIFO): closes the topmost modal first.
 * 
 * @param {function} onClose - Callback to close the modal
 * @param {boolean} [isOpen=true] - Whether the modal is currently open
 */
export const useEscapeKey = (onClose, isOpen = true) => {
  useEffect(() => {
    if (!isOpen || typeof onClose !== 'function') return;

    modalStack.push(onClose);

    return () => {
      const idx = modalStack.lastIndexOf(onClose);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }
    };
  }, [onClose, isOpen]);
};

export default useEscapeKey;
