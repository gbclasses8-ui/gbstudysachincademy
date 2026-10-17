import React from 'react';
import { Home, Layers, Send, Bookmark } from 'lucide-react';
import { TELEGRAM_URL } from '../data/batchesData';

interface BottomNavProps {
  currentView: 'home' | 'course';
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onGoHome: () => void;
  savedCount: number;
  onOpenTelegram: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  activeCategory,
  onSelectCategory,
  onGoHome,
  savedCount,
  onOpenTelegram,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#120410]/95 backdrop-blur-xl border-t border-pink-500/20 px-3 py-2 flex items-center justify-around">
      <button
        onClick={() => {
          onGoHome();
          onSelectCategory('all');
        }}
        className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition-colors ${
          currentView === 'home' && activeCategory === 'all'
            ? 'text-pink-400'
            : 'text-pink-300/60 hover:text-pink-200'
        }`}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button
        onClick={() => {
          onGoHome();
          onSelectCategory('all');
        }}
        className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition-colors ${
          currentView === 'home' && activeCategory !== 'saved'
            ? 'text-pink-400'
            : 'text-pink-300/60 hover:text-pink-200'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span>Batches</span>
      </button>

      <button
        onClick={onOpenTelegram}
        className="flex flex-col items-center gap-1 p-1 text-[10px] font-bold text-pink-300 hover:text-white"
      >
        <div className="w-7 h-7 rounded-full bg-pink-600 text-white flex items-center justify-center pink-glow-sm">
          <Send className="w-3.5 h-3.5" />
        </div>
        <span>Telegram</span>
      </button>

      <button
        onClick={() => {
          onGoHome();
          onSelectCategory('saved');
        }}
        className={`relative flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition-colors ${
          activeCategory === 'saved'
            ? 'text-pink-400'
            : 'text-pink-300/60 hover:text-pink-200'
        }`}
      >
        <Bookmark className="w-5 h-5" />
        <span>Saved</span>
        {savedCount > 0 && (
          <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-pink-500 text-[9px] text-white flex items-center justify-center font-bold">
            {savedCount}
          </span>
        )}
      </button>
    </div>
  );
};
