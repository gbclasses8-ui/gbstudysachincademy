import React, { useState, useMemo } from 'react';
import { Search, X, BookOpen, ChevronRight, Layers } from 'lucide-react';
import { Batch } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  onSelectBatch: (batch: Batch) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  batches,
  onSelectBatch,
}) => {
  const [query, setQuery] = useState('');

  const filteredBatches = useMemo(() => {
    if (!query.trim()) return batches.slice(0, 8);
    const q = query.toLowerCase();
    return batches.filter(
      (b) =>
        b.course_name.toLowerCase().includes(q) ||
        (b.category && b.category.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [query, batches]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-pink-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-pink-100 bg-pink-50/40">
          <Search className="w-5 h-5 text-pink-600 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batches, CTET, KVS, BPSC, SuperTET, subjects..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-sm focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto divide-y divide-slate-100 flex-1">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{query ? `Matching Batches (${filteredBatches.length})` : 'Popular Batches'}</span>
            <span className="text-pink-600 font-medium">GB STUDY</span>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Layers className="w-8 h-8 mx-auto text-pink-300 mb-2 stroke-1" />
              <p>No batches found matching "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for CTET, KVS, BPSC, or SuperTET</p>
            </div>
          ) : (
            filteredBatches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => {
                  onSelectBatch(batch);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 p-2.5 text-left rounded-xl hover:bg-pink-50/60 transition-colors group"
              >
                <div className="w-14 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    src={batch.course_thumbnail}
                    alt={batch.course_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://i.ibb.co/0R7qc34v/1093.jpg';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-pink-700 bg-pink-100/60 px-2 py-0.5 rounded-md">
                      {batch.category || 'Batch'}
                    </span>
                    <span className="text-[11px] text-slate-400">ID #{batch.id}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 truncate group-hover:text-pink-600 transition-colors mt-0.5">
                    {batch.course_name}
                  </h4>
                </div>
                <div className="flex items-center text-xs font-medium text-pink-600 shrink-0 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <span>Let's Study</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Quick Footer hint */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Search courses, classes, and study materials</span>
          <span className="text-pink-600 font-medium">Free Access · No Login Required</span>
        </div>
      </div>
    </div>
  );
};
