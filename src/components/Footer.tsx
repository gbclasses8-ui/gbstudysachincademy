import React from 'react';
import { Send, BookOpen, ShieldCheck, Heart, Sparkles, FileText, Video } from 'lucide-react';
import { TELEGRAM_URL, APP_LOGO } from './TelegramModal';

interface FooterProps {
  onSelectCategory?: (category: string) => void;
  onNavigateHome?: () => void;
  onOpenTelegram?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onNavigateHome,
  onOpenTelegram,
}) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-pink-900/40 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Col 1: Brand & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-pink-500/40">
                <img
                  src={APP_LOGO}
                  alt="GB STUDY"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                  GB STUDY
                </span>
                <p className="text-[11px] text-pink-300 font-medium">
                  Free Online Learning Portal
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              GB STUDY is dedicated to helping teaching aspirants succeed in CTET, KVS/NVS, BPSC TRE, and State TET exams. All video lectures, chapter quizzes, and PDF materials are provided freely without paywalls or login hurdles.
            </p>

            <div className="pt-2">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs shadow-md shadow-pink-500/20 transition-all hover:scale-[1.02]"
              >
                <Send className="w-4 h-4" />
                <span>Join Official Telegram Channel</span>
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Exam Batches
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    onNavigateHome?.();
                    onSelectCategory?.('CTET');
                  }}
                  className="hover:text-pink-400 transition-colors"
                >
                  CTET 2026 Paper 1 & 2
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateHome?.();
                    onSelectCategory?.('BPSC TRE');
                  }}
                  className="hover:text-pink-400 transition-colors"
                >
                  BPSC TRE 3.0 & 4.0 Batches
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateHome?.();
                    onSelectCategory?.('KVS/NVS');
                  }}
                  className="hover:text-pink-400 transition-colors"
                >
                  KVS / NVS PRT & Tier-1
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateHome?.();
                    onSelectCategory?.('UP SuperTET');
                  }}
                  className="hover:text-pink-400 transition-colors"
                >
                  UP SuperTET Primary & Junior
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateHome?.();
                    onSelectCategory?.('State TET');
                  }}
                  className="hover:text-pink-400 transition-colors"
                >
                  Jharkhand & State TET
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Student Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Study Resources
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <Video className="w-3.5 h-3.5 text-pink-500" />
                <span>HLS Adaptive Video Streaming</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <FileText className="w-3.5 h-3.5 text-pink-500" />
                <span>Chapter-wise Class PDFs</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                <span>Timestamped Personal Notes</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
                <span>No Registration Required</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>
            © {new Date().getFullYear()} GB STUDY. All rights reserved. Made for teaching exam aspirants.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <a 
              href={TELEGRAM_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-pink-400 hover:underline font-semibold"
            >
              Telegram Community (@GBFreestudy)
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
