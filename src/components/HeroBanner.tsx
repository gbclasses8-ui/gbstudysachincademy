import React from 'react';
import { Search, Send, GraduationCap, CheckCircle, Video, FileText, Sparkles } from 'lucide-react';
import { TELEGRAM_URL, APP_LOGO } from './TelegramModal';

interface HeroBannerProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: string[];
  totalBatches: number;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  categories,
  totalBatches,
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-pink-100/70 via-pink-50/40 to-white pt-8 pb-12 border-b border-pink-100">
      {/* Decorative subtle ambient pink blur */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-rose-300/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          
          {/* Brand Icon + Name Tagline */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-pink-200 shadow-xs mb-1">
            <img
              src={APP_LOGO}
              alt="GB STUDY"
              className="w-5 h-5 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-bold text-pink-700 tracking-wide">
              GB STUDY · Official Student Learning Hub
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight text-balance leading-tight">
            Master Teaching Exams with <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">GB STUDY</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed text-balance">
            Access complete video classes, chapter-wise pedagogical notes, and verified PDF handouts for CTET 2026, KVS/NVS, BPSC TRE, and UP SuperTET without any login barriers.
          </p>

          {/* Search Box with Pink Accents */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative flex items-center shadow-md rounded-2xl bg-white border-2 border-pink-300 focus-within:border-pink-600 focus-within:ring-4 focus-within:ring-pink-100 transition-all">
              <Search className="w-5 h-5 text-pink-500 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by exam name (e.g., CTET Paper 1, KVS, BPSC TRE, Sanskrit)..."
                className="w-full px-3 py-3.5 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="mr-3 text-xs font-semibold text-slate-400 hover:text-pink-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Highlights / Trust metrics without pill clutter */}
          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-600 pt-2">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-4 h-4 text-pink-600" />
              <span>{totalBatches} Real Batches Available</span>
            </div>
            <span className="text-pink-200">/</span>
            <div className="flex items-center gap-1.5 font-medium">
              <Video className="w-4 h-4 text-pink-600" />
              <span>HLS High-Speed Player</span>
            </div>
            <span className="text-pink-200">/</span>
            <div className="flex items-center gap-1.5 font-medium">
              <FileText className="w-4 h-4 text-pink-600" />
              <span>Official PDF Handouts</span>
            </div>
            <span className="text-pink-200">/</span>
            <div className="flex items-center gap-1.5 font-medium text-pink-700">
              <Sparkles className="w-4 h-4 text-pink-600" />
              <span>No Login or Signup Required</span>
            </div>
          </div>
        </div>

        {/* Category Segmented Tabs (Interactive Filter Buttons) */}
        <div className="mt-8 flex items-center justify-center flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const isLiveCat = cat === 'Live Classes';

            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25 scale-105'
                    : 'bg-white text-slate-600 hover:text-pink-600 hover:bg-pink-50 border border-pink-200'
                }`}
              >
                {isLiveCat && (
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-red-500'} animate-pulse`} />
                )}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
