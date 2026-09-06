import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4500) => {
    if (!message) return;
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg: string, dur?: number) => showToast(msg, 'success', dur),
    error: (msg: string, dur?: number) => showToast(msg, 'error', dur),
    warning: (msg: string, dur?: number) => showToast(msg, 'warning', dur),
    info: (msg: string, dur?: number) => showToast(msg, 'info', dur),
  };

  // Intercept native window.alert so NO browser native alert popups appear anywhere
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      const messageStr = String(msg || '');
      const lower = messageStr.toLowerCase();
      let type: ToastType = 'info';

      if (lower.includes('error') || lower.includes('failed') || lower.includes('forbidden') || lower.includes('invalid') || lower.includes('unable')) {
        type = 'error';
      } else if (lower.includes('success') || lower.includes('generated') || lower.includes('saved') || lower.includes('sent') || lower.includes('updated') || lower.includes('complete')) {
        type = 'success';
      } else if (lower.includes('already') || lower.includes('warning') || lower.includes('caution') || lower.includes('pending')) {
        type = 'warning';
      }

      showToast(messageStr, type);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}

      {/* Floating UI Container for Alert Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let bgClass = 'bg-slate-900 border-slate-700 text-white';
          let icon = <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />;

          if (t.type === 'success') {
            bgClass = 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-emerald-900/20';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
          } else if (t.type === 'error') {
            bgClass = 'bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-rose-900/20';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-950/95 border-amber-500/40 text-amber-100 shadow-amber-900/20';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
          } else {
            bgClass = 'bg-slate-900/95 border-brand-500/40 text-slate-100 shadow-brand-900/20';
            icon = <Info className="w-5 h-5 text-brand-400 flex-shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md shadow-xl flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-top-4 duration-300 ${bgClass}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 text-xs font-semibold leading-relaxed break-words">
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
