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
          borderColor: 'border-red-500',
          iconColor: 'text-red-400',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          icon: AlertTriangle,
        };
      case 'warning':
        return {
          borderColor: 'border-amber-500',
          iconColor: 'text-amber-400',
          buttonBg: 'bg-amber-600 hover:bg-amber-700',
          icon: AlertCircle,
        };
      case 'info':
        return {
          borderColor: 'border-blue-500',
          iconColor: 'text-blue-400',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
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
        <div className={`bg-zinc-900 rounded-lg border-2 ${styles.borderColor} shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
            <Icon className={`w-6 h-6 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
            <h2 className="text-xl font-semibold text-zinc-100 flex-1">{title}</h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 text-zinc-300 text-sm leading-relaxed">
            {typeof message === 'string' ? (
              <p className="whitespace-pre-line">{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
