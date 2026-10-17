import React, { useState } from 'react';
import { Download, Copy, Check, ArrowLeft, X, Sparkles, ExternalLink } from 'lucide-react';
import { VideoMediaData } from '../types';
import { GB_LOGO_URL } from '../data/batchesData';

interface DownloaderModalProps {
  media: VideoMediaData | null;
  onClose: () => void;
  onWatchNow: () => void;
}

export const DownloaderModal: React.FC<DownloaderModalProps> = ({
  media,
  onClose,
  onWatchNow,
}) => {
  const [copied, setCopied] = useState(false);

  if (!media) return null;

  const handleCopy = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const parsedDownloads: Array<{ title: string; url: string }> = Array.isArray(media.download_urls)
    ? media.download_urls
    : [];

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0c040b] border border-pink-500/30 rounded-2xl shadow-[0_0_40px_rgba(236,72,153,0.3)] overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#140612]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-pink-500/30">
                <img src={GB_LOGO_URL} alt="GB STUDY" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-syne">
                GB STUDY &bull; <span className="text-pink-400">DOWNLOADER</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Lecture Card */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#140612] p-4 rounded-xl border border-white/5">
            <div className="w-full sm:w-44 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative border border-white/10">
              <img
                src={media.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'}
                alt={media.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase">
                Ready to Download
              </span>
              <h3 className="text-base font-bold text-white mt-1.5 leading-snug line-clamp-2">
                {media.title}
              </h3>
              <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                <button
                  onClick={onWatchNow}
                  className="px-3.5 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs transition-colors btn-click-effect flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Watch Video
                </button>
                {media.file_url && (
                  <button
                    onClick={() => handleCopy(media.file_url)}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white font-medium text-xs transition-colors border border-white/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-pink-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied Link' : 'Copy Stream'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Download Quality Options */}
          <div>
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-pink-400" /> Available Video Resolutions
            </h4>

            {parsedDownloads.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parsedDownloads.map((dl, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#140612] border border-pink-500/20 flex items-center justify-between gap-3 hover:border-pink-500/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{dl.title}p</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-500/20">
                          MP4 Direct
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">High speed CloudFront CDN</span>
                    </div>

                    <a
                      href={dl.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#140612] border border-white/5 text-center">
                <p className="text-xs text-stone-400 mb-3">
                  This video is served via encrypted adaptive stream. You can watch directly or open the stream URL.
                </p>
                {media.file_url && (
                  <a
                    href={media.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Direct Stream Link
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
