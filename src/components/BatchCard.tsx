import React from 'react';
import { ArrowRight, BookOpen, PlayCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Batch } from '../types';

interface BatchCardProps {
  batch: Batch;
  onSelect: (batch: Batch) => void;
}

export const BatchCard: React.FC<BatchCardProps> = ({ batch, onSelect }) => {
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-pink-200/90 shadow-xs hover:shadow-xl hover:border-pink-400 transition-all duration-300 overflow-hidden hover:-translate-y-1">
      
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-b border-pink-100">
        <img
          src={batch.course_thumbnail}
          alt={batch.course_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://i.ibb.co/0R7qc34v/1093.jpg';
          }}
        />

        {/* Category Tag (unboxed clean tag or top badge) */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-pink-600/95 text-white text-[11px] font-bold tracking-wide shadow-xs backdrop-blur-xs">
          {batch.category || 'Special Batch'}
        </div>

        {/* Free Access Tag */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-semibold shadow-xs">
          100% Free
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-5 space-y-3">
        
        {/* Title */}
        <h3 
          className="text-base font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-pink-600 transition-colors"
          title={batch.course_name}
        >
          {batch.course_name}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed flex-1">
          {batch.description || 'Full complete syllabus coverage with verified video lectures, chapter quizzes, and PDF materials.'}
        </p>

        {/* Micro Features / Course highlights */}
        <div className="pt-2 border-t border-pink-50 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5 text-pink-700">
            <PlayCircle className="w-3.5 h-3.5 text-pink-600" />
            <span>Full Lectures</span>
          </div>
          <span className="text-pink-200">·</span>
          <div className="flex items-center gap-1.5 text-slate-600">
            <FileText className="w-3.5 h-3.5 text-pink-600" />
            <span>Handout PDFs</span>
          </div>
          <span className="text-pink-200">·</span>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span>{batch.language || 'Hindi & Eng'}</span>
          </div>
        </div>

        {/* Primary Pink Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => onSelect(batch)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>Let's Study</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelect(batch)}
            className="px-3.5 py-2.5 rounded-xl border border-pink-300 text-pink-600 hover:bg-pink-50 font-semibold text-xs transition-colors shrink-0"
            title="Enroll Free"
          >
            Enroll Free
          </button>
        </div>
      </div>
    </div>
  );
};
