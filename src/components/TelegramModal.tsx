import React from 'react';
import { Send, X, BellRing, Sparkles, CheckCircle2 } from 'lucide-react';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TELEGRAM_URL = 'https://t.me/GBFreestudy';
export const APP_LOGO = 'https://i.ibb.co/0R7qc34v/1093.jpg';

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner in Pink */}
        <div className="relative bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 px-6 pt-8 pb-6 text-white text-center">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close Telegram popup"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo badge */}
          <div className="inline-block p-1 bg-white rounded-2xl shadow-lg ring-4 ring-pink-300/30 mb-3">
            <img
              src={APP_LOGO}
              alt="GB STUDY"
              className="w-16 h-16 rounded-xl object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-1">
            Join GB STUDY Telegram Channel
          </h2>
          <p className="text-pink-100 text-xs font-medium">
            Official Community for Teaching & Competitive Exams
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4">
          <div className="bg-pink-50/70 rounded-2xl p-4 border border-pink-100 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Instant alerts for new lectures & live classes</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Free Chapter-wise PDF Notes & Test Handouts</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
              <span>CTET, KVS, BPSC TRE, UP SuperTET updates</span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            Click below to join <span className="font-semibold text-pink-600">@GBFreestudy</span> on Telegram directly.
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-sm shadow-md shadow-pink-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Send className="w-4 h-4" />
              <span>Join Telegram</span>
            </a>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
