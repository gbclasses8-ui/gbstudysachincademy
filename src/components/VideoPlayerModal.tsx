import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  ArrowLeft, Maximize, Minimize, Settings, 
  Gauge, Monitor, Sparkles, Download, ExternalLink, 
  AlertCircle, CheckCircle2 
} from 'lucide-react';
import { VideoMediaData } from '../types';
import { GB_LOGO_URL, TELEGRAM_URL } from '../data/batchesData';

interface VideoPlayerModalProps {
  media: VideoMediaData | null;
  onClose: () => void;
  onOpenDownload?: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  media,
  onClose,
  onOpenDownload,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fileUrl = media?.file_url || '';
  const isYouTube =
    fileUrl.includes('youtube.com') ||
    fileUrl.includes('youtu.be') ||
    media?.video_type === 1;

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
    if (match) videoId = match[1];
    else if (/^[\w-]{11}$/.test(url)) videoId = url;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
  };

  useEffect(() => {
    if (!media || isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setLoadError(null);
    let hls: Hls | null = null;

    if (fileUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
          maxBufferLength: 60,
          maxMaxBufferLength: 600,
          backBufferLength: 90,
          manifestLoadingTimeOut: 15000,
          manifestLoadingMaxRetry: 4,
          levelLoadingTimeOut: 15000,
          levelLoadingMaxRetry: 4,
        });
        hls.loadSource(fileUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(() => {
            // If browser blocks unmuted autoplay, try muted
            video.muted = true;
            video.play().catch(() => {});
          });
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                hls?.destroy();
                setLoadError('Stream unavailable. You can open directly or download below.');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = fileUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(() => {});
        });
      } else {
        setLoadError('HLS not supported on this browser.');
      }
    } else {
      video.src = fileUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setIsLoading(false);
        setLoadError('Unable to play video format directly.');
      });
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [fileUrl, media, isYouTube]);

  const setSpeed = (val: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = val;
    }
    setPlaybackSpeed(val);
  };

  const toggleFullScreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!media) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto flex flex-col">
      {/* Top Navbar matching play.html */}
      <nav className="w-full z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 h-[64px] sticky top-0 shrink-0">
        <div className="max-w-[90rem] mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2.5 bg-[#121212] border border-white/10 hover:bg-pink-500 hover:text-white rounded-lg btn-click-effect text-stone-400 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:block uppercase tracking-wider">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black border border-white/20 rounded-lg flex items-center justify-center overflow-hidden shadow-lg">
                <img src={GB_LOGO_URL} alt="GB STUDY" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-lg font-black text-white tracking-wider font-syne">
                GB <span className="text-pink-500">STUDY</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-md shadow-sm">
            <div className="w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
            <span className="text-[11px] font-bold text-pink-400 tracking-wide uppercase">Player</span>
          </div>
        </div>
      </nav>

      {/* Main Player Screen matching play.html */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 flex flex-col justify-center">
        <div className="flex flex-col w-full fade-in">
          {/* Player Box */}
          <div
            ref={containerRef}
            className="w-full aspect-video relative border border-white/10 mb-5 mx-auto max-w-5xl rounded-xl bg-black overflow-hidden shadow-2xl"
          >
            {isYouTube ? (
              <iframe
                src={getYouTubeEmbedUrl(fileUrl)}
                title={media.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />

                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none">
                    <div className="w-10 h-10 mb-3 border-[3px] border-white/10 border-t-pink-500 rounded-full animate-spin shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
                    <p className="text-slate-300 font-semibold text-sm">Loading Content...</p>
                  </div>
                )}

                {loadError && (
                  <div className="absolute inset-4 bg-pink-950/90 border border-pink-500/40 rounded-xl flex flex-col items-center justify-center p-6 text-center z-20">
                    <AlertCircle className="w-10 h-10 text-pink-400 mb-2" />
                    <h4 className="text-sm font-bold text-white mb-1">Direct Stream Notice</h4>
                    <p className="text-xs text-pink-200/80 max-w-md mb-4">{loadError}</p>
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 flex items-center gap-1.5 shadow-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Direct Video
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Details & Controls Section matching play.html */}
          <div className="max-w-5xl w-full mx-auto bg-[#121212] border border-white/10 p-5 sm:p-7 rounded-2xl flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/30 px-3 py-1 rounded-md mb-3 shadow-sm">
                  <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">
                    GB STUDY PLAYER
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  {media.title}
                </h1>
              </div>

              {media.is_live === 1 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 mt-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
                </span>
              )}
            </div>

            {/* 3 Columns matching play.html */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 mt-6 border-t border-white/10">
              {/* Column 1: Video Quality */}
              <div>
                <div className="text-xs font-bold text-stone-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Settings className="w-4 h-4 text-pink-500" /> Video Quality
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-pink-300 text-xs font-medium bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-pink-500/20">
                    Auto Adaptive (HD)
                  </span>
                  {Array.isArray(media.download_urls) && media.download_urls.length > 0 && (
                    <button
                      onClick={onOpenDownload}
                      className="text-stone-300 hover:text-white text-xs font-medium bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Downloads ({media.download_urls.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Column 2: Playback Speed */}
              <div>
                <div className="text-xs font-bold text-stone-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Gauge className="w-4 h-4 text-pink-500" /> Playback Speed
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeed(rate)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        playbackSpeed === rate
                          ? 'bg-pink-500 text-white border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]'
                          : 'bg-[#0a0a0a] text-stone-400 hover:text-white border-white/10'
                      }`}
                    >
                      {rate.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 3: Display */}
              <div>
                <div className="text-xs font-bold text-stone-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Monitor className="w-4 h-4 text-pink-500" /> Display
                </div>
                <button
                  onClick={toggleFullScreen}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-pink-400 border border-pink-500/30 hover:bg-pink-500/10 hover:border-pink-500/50 transition-all font-semibold text-xs cursor-pointer"
                >
                  <Maximize className="w-4 h-4" /> Full Screen
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
