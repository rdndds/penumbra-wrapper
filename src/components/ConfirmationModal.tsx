import { useEffect, useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  variant: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}: ConfirmationModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Destructive actions have 2-second countdown
  const isDestructive = variant === 'danger';

  // Initialize countdown for destructive actions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && isDestructive) {
        setCountdown(2);
      } else {
        setCountdown(null);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, isDestructive]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown === 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle fade in animation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setIsVisible(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      } else if (e.key === 'Enter' && !isLoading && (countdown === 0 || !isDestructive)) {
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm, isLoading, countdown, isDestructive]);

  if (!isVisible && !isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          borderColor: 'border-[var(--danger)]',
          iconColor: 'text-[var(--danger)]',
          buttonBg: 'bg-[var(--danger)] hover:bg-[var(--danger-hover)]',
          icon: AlertTriangle,
        };
      case 'warning':
        return {
          borderColor: 'border-[var(--warning)]',
          iconColor: 'text-[var(--warning)]',
          buttonBg: 'bg-[var(--warning)] hover:bg-[var(--warning-hover)]',
          icon: AlertCircle,
        };
      case 'info':
        return {
          borderColor: 'border-[var(--primary)]',
          iconColor: 'text-[var(--primary)]',
          buttonBg: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)]',
          icon: Info,
        };
    }
  };

  const styles = getVariantStyles();
  const Icon = styles.icon;

  const isConfirmDisabled = isLoading || (isDestructive && countdown !== 0);
  const confirmButtonText = isDestructive && countdown !== null && countdown > 0
    ? `${confirmText} (${countdown})...`
    : confirmText;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-lg mx-4 transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className={`bg-[var(--surface)] rounded-lg border-2 ${styles.borderColor} shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-[var(--border)]">
            <Icon className={`w-6 h-6 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
            <h2 className="text-xl font-semibold text-[var(--text)] flex-1">{title}</h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 hover:bg-[var(--surface-alt)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 text-[var(--text)] text-sm leading-relaxed">
            {typeof message === 'string' ? (
              <p className="whitespace-pre-line">{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border)] bg-[var(--surface)]">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] text-[var(--text)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className={`px-5 py-2 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.buttonBg}`}
            >
              {isLoading ? 'Processing...' : confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
