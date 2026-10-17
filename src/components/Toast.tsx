import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  if (!message) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm shadow-[0_10px_30px_rgba(0,0,0,0.7)] border toast-enter pointer-events-none transition-all duration-300 bg-[#121212]/95 backdrop-blur-md border-pink-500/40 text-pink-300">
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-pink-400" />
      ) : type === 'error' ? (
        <AlertCircle className="w-4 h-4 text-red-400" />
      ) : (
        <Info className="w-4 h-4 text-pink-400" />
      )}
      <span>{message}</span>
    </div>
  );
};
