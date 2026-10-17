import React from 'react';
import { X, FileText, Download, ExternalLink, Send, Sparkles } from 'lucide-react';
import { GB_LOGO_URL, TELEGRAM_URL } from '../data/batchesData';

interface PdfViewerModalProps {
  pdfUrl: string;
  title: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  pdfUrl,
  title,
  onClose,
}) => {
  if (!pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[90vh] bg-[#120410] border border-pink-500/30 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.35)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-4 bg-[#180516] border-b border-pink-500/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 p-0.5 bg-gradient-to-tr from-pink-500 to-rose-400">
              <img src={GB_LOGO_URL} alt="GB STUDY" className="w-full h-full object-cover rounded-md" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                <FileText className="w-3 h-3" /> GB STUDY PDF NOTES
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white truncate font-heading">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white btn-pink-gradient flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Tab</span>
            </a>
            <a
              href={pdfUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-pink-200 hover:text-white bg-pink-900/40 hover:bg-pink-800/60 border border-pink-500/30 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-pink-300 hover:text-white hover:bg-pink-500/20 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 w-full bg-[#080207] relative overflow-hidden flex flex-col items-center justify-center">
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            title={title}
            className="w-full h-full border-0"
          />

          {/* Fallback bar at the bottom */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-4 py-2 rounded-xl border border-pink-500/30 flex items-center gap-3 text-xs text-pink-200">
            <span>Having trouble previewing?</span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-pink-400 font-bold underline hover:text-pink-300 flex items-center gap-1"
            >
              Click here to view PDF directly <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
