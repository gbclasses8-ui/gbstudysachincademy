import React from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';
import { getPdfViewerUrl, extractPdfUrl } from '../services/api';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfUrl: string;
}

export const PdfModal: React.FC<PdfModalProps> = ({ isOpen, onClose, title, pdfUrl }) => {
  if (!isOpen || !pdfUrl) return null;

  const directPdfUrl = extractPdfUrl(pdfUrl);
  const viewerUrl = getPdfViewerUrl(pdfUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-pink-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-lg bg-pink-600/30 flex items-center justify-center text-pink-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-white truncate" title={title}>
                {title || 'Lecture PDF Handout'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                GB STUDY Official Lecture Notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={directPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium transition-colors"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              title="Open full viewer in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              aria-label="Close PDF viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 w-full bg-slate-100 relative">
          <iframe
            src={viewerUrl}
            title={title}
            className="w-full h-full border-0"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-pink-50 border-t border-pink-100 flex items-center justify-between text-xs text-slate-600">
          <span className="truncate">Provided free by GB STUDY for student preparation</span>
          <a 
            href="https://t.me/GBFreestudy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-pink-600 font-semibold hover:underline shrink-0 ml-2"
          >
            Join Telegram for more notes →
          </a>
        </div>
      </div>
    </div>
  );
};
