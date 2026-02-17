import { useState, useRef, createContext, useContext, useCallback } from 'react';

interface ToastMessage { id: number; message: string; type: 'success' | 'error' | 'info' }

const ToastContext = createContext<{ addToast: (message: string, type?: ToastMessage['type']) => void }>({ addToast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextIdRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = ++nextIdRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((toast) => toast.id !== id)), 4000);
  }, []);

  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`${colors[t.type]} text-white px-4 py-2 rounded-lg shadow-lg text-sm`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
