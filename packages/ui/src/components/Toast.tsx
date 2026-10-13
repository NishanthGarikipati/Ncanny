'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface ToastOptions {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Milliseconds before auto-dismissal; `null` keeps the toast until dismissed. */
  duration?: number | null;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-info/40 bg-info-soft text-info',
  success: 'border-success/40 bg-success-soft text-success',
  warning: 'border-warning/40 bg-warning-soft text-warning',
  danger: 'border-danger/40 bg-danger-soft text-danger',
};

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ tone = 'info', title, description, duration = DEFAULT_DURATION }: ToastOptions) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((current) => [...current, { id, tone, title, description }]);

      if (duration !== null) {
        setTimeout(() => dismissToast(id), duration);
      }
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
}

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/**
 * The viewport is a live region so that toasts are announced without stealing
 * focus; errors are assertive, everything else is polite.
 */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'danger' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border px-4 py-3',
            'shadow-level-2 animate-fade-in motion-reduce:animate-none',
            TONE_CLASSES[toast.tone],
          )}
        >
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">{toast.title}</p>
            {toast.description && <p className="mt-0.5 opacity-90">{toast.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded p-1 text-current opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <span className="sr-only">Dismiss notification</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
