import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * Open/close state for a dropdown: closes on outside click and on Escape
 * (returning focus to the trigger).
 */
export default function useDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return {
    open,
    close,
    toggle,
    rootRef,
    triggerProps: {
      ref: triggerRef,
      onClick: toggle,
      'aria-expanded': open,
      'aria-controls': menuId,
    },
    menuProps: { id: menuId },
  };
}
