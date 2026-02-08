import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ConfirmationContext } from './confirmationContext';
import type { ConfirmOptions, ConfirmationContextValue } from './confirmationContext';

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolvePromiseRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (resolvePromiseRef.current) {
        resolvePromiseRef.current(false);
        resolvePromiseRef.current = null;
      }
    };
  }, []);

  const confirm = useCallback((confirmOptions: ConfirmOptions): Promise<boolean> => {
    setOptions(confirmOptions);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolvePromiseRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current(false);
      resolvePromiseRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current(true);
      resolvePromiseRef.current = null;
    }
  }, []);

  const value = useMemo<ConfirmationContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      {options && (
        <ConfirmationModal
          isOpen={isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={options.title}
          message={options.message}
          variant={options.variant}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
        />
      )}
    </ConfirmationContext.Provider>
  );
}
