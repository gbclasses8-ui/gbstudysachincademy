import React from 'react';
import { Play, Download } from 'lucide-react';

interface VideoOptionsModalProps {
  isOpen: boolean;
  title?: string;
  onWatch: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export const VideoOptionsModal: React.FC<VideoOptionsModalProps> = ({
  isOpen,
  title,
  onWatch,
  onDownload,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#18181b] border border-pink-500/30 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
        <h3 className="text-lg font-bold text-white mb-1">Video Options</h3>
        {title && <p className="text-xs text-stone-400 mb-4 truncate">{title}</p>}

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onWatch}
            className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-pink-500 hover:bg-pink-600 text-white transition-colors btn-click-effect flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" /> Watch Now
          </button>

          <button
            onClick={onDownload}
            className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-white/5 hover:bg-white/10 text-white transition-colors btn-click-effect flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download
          </button>

          <button
            onClick={onClose}
            className="w-full mt-2 px-4 py-2 rounded-lg font-medium text-sm text-stone-400 hover:text-white transition-colors btn-click-effect cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
