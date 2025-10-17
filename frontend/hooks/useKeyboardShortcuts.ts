import { useEffect } from 'react';

interface KeyboardShortcuts {
  onSpace?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
}

export function useKeyboardShortcuts({
  onSpace,
  onEscape,
  onEnter,
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          onSpace?.();
          break;
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
        case 'Enter':
          event.preventDefault();
          onEnter?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSpace, onEscape, onEnter]);
}
