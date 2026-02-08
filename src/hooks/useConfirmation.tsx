import { useContext } from 'react';
import { ConfirmationContext } from './confirmationContext';
import type { ConfirmationContextValue } from './confirmationContext';

export function useConfirmation(): ConfirmationContextValue {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }
  return context;
}
