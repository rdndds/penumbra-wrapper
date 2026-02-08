import { createContext } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string | React.ReactNode;
  variant: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmationContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);
