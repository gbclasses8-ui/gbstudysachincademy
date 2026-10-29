import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX, 
  Maximize, Minimize, Settings, Check, Clock, AlertCircle, Loader2, 
  Video, PictureInPicture2, ChevronRight, ChevronLeft, Sparkles, Sliders
} from 'lucide-react';
import { VideoStream } from '../types';
import { getProxiedStreamUrl } from '../services/api';

export interface VideoPlayerProps {
  title: string;
  courseName?: string;
  streams: VideoStream[];
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
  isLive?: boolean;
  isLiveWaiting?: boolean;
  liveScheduleTime?: string;
  facultyName?: string;
  onRetryStream?: () => void;
  retryCountdown?: number;
  prevLectureTitle?: string;
  nextLectureTitle?: string;
  onPrevLecture?: () => void;
  onNextLecture?: () => void;
  onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  onSeekRequested?: (seekFn: (time: number) => void) => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  title,
  courseName,
  streams,
  selectedQuality,
  onQualityChange,
  isLive = false,
  isLiveWaiting = false,
  liveScheduleTime,
  facultyName,
  onRetryStream,
  retryCountdown = 15,
  prevLectureTitle,
  nextLectureTitle,
  onPrevLecture,
  onNextLecture,
  onTimeUpdateCallback,
  onSeekRequested,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimerRef = useRef<{ time: number; x: number } | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [buffering, setBuffering] = useState<boolean>(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Volume & Speed & Fullscreen
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('gb_player_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('gb_player_speed');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // UI state
  const [showControls, setShowControls] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<'none' | 'settings' | 'speed' | 'quality'>('none');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'forward' | 'rewind' | null>(null);
  const [centerIconAnimation, setCenterIconAnimation] = useState<'play' | 'pause' | null>(null);

  // Expose seek function to parent (e.g. for timed notes)
  useEffect(() => {
    if (onSeekRequested) {
      onSeekRequested((seekTime: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seekTime;
          if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
        }
      });
    }
  }, [onSeekRequested]);

  // Format time (00:00 or 00:00:00)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Activity timer for auto-hiding controls
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // Only auto-hide if playing and menus are closed
    if (isPlaying && activeMenu === 'none') {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying, activeMenu]);

  useEffect(() => {
    handleUserActivity();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying, activeMenu, handleUserActivity]);

  // Track fullscreen changes across browsers
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume((v) => {
            const next = Math.min(1, Math.round((v + 0.1) * 10) / 10);
            if (videoRef.current) {
              videoRef.current.volume = next;
              videoRef.current.muted = false;
            }
            setIsMuted(false);
            localStorage.setItem('gb_player_volume', next.toString());
            return next;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((v) => {
            const next = Math.max(0, Math.round((v - 0.1) * 10) / 10);
            if (videoRef.current) {
              videoRef.current.volume = next;
              videoRef.current.muted = next === 0;
            }
            setIsMuted(next === 0);
            localStorage.setItem('gb_player_volume', next.toString());
            return next;
          });
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case '>':
        case '.':
          e.preventDefault();
          changeSpeedRelative(1);
          break;
        case '<':
        case ',':
          e.preventDefault();
          changeSpeedRelative(-1);
          break;
      }
      handleUserActivity();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUserActivity]);

  // Load and attach Hls/stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedQuality || streams.length === 0 || isLiveWaiting) return;

    const currentStream = streams.find((s) => s.label === selectedQuality) || streams[0];
    if (!currentStream || !currentStream.url) return;

    const streamUrl = getProxiedStreamUrl(currentStream.url);
    const prevTime = video.currentTime > 0 ? video.currentTime : 0;
    const wasPlaying = !video.paused;

    setBuffering(true);
    setPlayerError(null);

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (currentStream.isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: isLive,
        backBufferLength: 90,
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setBuffering(false);
        video.playbackRate = playbackSpeed;
        if (prevTime > 0) video.currentTime = prevTime;
        if (wasPlaying) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS stream error:', data);
              hls.destroy();
              setPlayerError('Stream error encountered. Click Retry below to reload.');
              break;
          }
        }
      });
    } else {
      // Native video fallback (Safari / iOS / MP4)
      video.src = streamUrl;
      video.playbackRate = playbackSpeed;
      video.addEventListener(
        'loadedmetadata',
        () => {
          setBuffering(false);
          video.playbackRate = playbackSpeed;
          if (prevTime > 0) video.currentTime = prevTime;
          if (wasPlaying) video.play().catch(() => {});
        },
        { once: true }
      );
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedQuality, streams, isLive, isLiveWaiting]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 0;
      setCurrentTime(cur);
      setDuration(dur);
      if (onTimeUpdateCallback) {
        onTimeUpdateCallback(cur, dur);
      }

      // Calculate buffer end
      const buf = videoRef.current.buffered;
      if (buf && buf.length > 0) {
        for (let i = 0; i < buf.length; i++) {
          if (buf.start(i) <= cur && cur <= buf.end(i)) {
            setBufferedEnd(buf.end(i));
            break;
          }
        }
      }
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleWaiting = () => setBuffering(true);
  const handlePlaying = () => setBuffering(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setCenterIconAnimation('play');
    } else {
      videoRef.current.pause();
      setCenterIconAnimation('pause');
    }
    setTimeout(() => setCenterIconAnimation(null), 600);
  };

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(duration || 0, seconds));
    setCurrentTime(clamped);
    videoRef.current.currentTime = clamped;
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = videoRef.current.currentTime + seconds;
    handleSeek(newTime);
    setDoubleTapFeedback(seconds > 0 ? 'forward' : 'rewind');
    setTimeout(() => setDoubleTapFeedback(null), 600);
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    localStorage.setItem('gb_player_speed', speed.toString());
    setActiveMenu('none');
  };

  const changeSpeedRelative = (direction: number) => {
    const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIdx = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, (idx === -1 ? 3 : idx) + direction));
    handleSpeedSelect(PLAYBACK_SPEEDS[nextIdx]);
  };

  const handleQualitySelect = (quality: string) => {
    onQualityChange(quality);
    localStorage.setItem('gb_player_quality', quality);
    setActiveMenu('none');
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
    localStorage.setItem('gb_player_volume', val.toString());
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        // iOS Safari full screen fallback
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Double tap handling on mobile / video surface
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = 'clientX' in e ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const relativeX = clientX - rect.left;
    const width = rect.width;
    const now = Date.now();

    // Check if this is a double tap within 300ms
    if (doubleTapTimerRef.current && (now - doubleTapTimerRef.current.time < 300)) {
      if (relativeX < width * 0.35) {
        // Double tap left side -> rewind 10s
        handleSkip(-10);
      } else if (relativeX > width * 0.65) {
        // Double tap right side -> forward 10s
        handleSkip(10);
      } else {
        // Center double tap -> toggle fullscreen
        toggleFullscreen();
      }
      doubleTapTimerRef.current = null;
      return;
    }

    doubleTapTimerRef.current = { time: now, x: relativeX };
    // Single tap toggles controls visibility or play
    handleUserActivity();
  };

  // Hover scrubber preview time calculation
  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onMouseLeave={() => {
        if (isPlaying && activeMenu === 'none') setShowControls(false);
      }}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-pink-950/70 select-none group flex items-center justify-center ${
        isFullscreen ? 'rounded-none border-0 max-h-screen' : ''
      }`}
    >
      {/* 1. Main HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* 2. Interactive Surface for Touch & Double Tap */}
      <div 
        onClick={handleSurfaceClick}
        className="absolute inset-0 z-10 cursor-pointer"
        aria-label="Video Play Surface"
      />

      {/* 3. Center Animated Play/Pause Feedback Icon */}
      {centerIconAnimation && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white ring-2 ring-pink-500/50 animate-double-tap">
            {centerIconAnimation === 'play' ? (
              <Play className="w-8 h-8 fill-current ml-1 text-pink-400" />
            ) : (
              <Pause className="w-8 h-8 fill-current text-pink-400" />
            )}
          </div>
        </div>
      )}

      {/* 4. Double Tap Skip Ripple Animations */}
      {doubleTapFeedback && (
        <div className={`absolute inset-y-0 z-20 flex items-center justify-center pointer-events-none w-1/3 ${
          doubleTapFeedback === 'rewind' ? 'left-0 bg-gradient-to-r from-pink-600/20 to-transparent' : 'right-0 bg-gradient-to-l from-pink-600/20 to-transparent'
        }`}>
          <div className="flex flex-col items-center gap-1 bg-black/60 px-4 py-2.5 rounded-2xl text-white backdrop-blur-md border border-pink-500/30 animate-double-tap">
            {doubleTapFeedback === 'rewind' ? (
              <>
                <RotateCcw className="w-6 h-6 text-pink-400 animate-spin" />
                <span className="text-xs font-bold font-mono">-10s</span>
              </>
            ) : (
              <>
                <RotateCw className="w-6 h-6 text-pink-400 animate-spin" />
                <span className="text-xs font-bold font-mono">+10s</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. Buffering Indicator */}
      {buffering && !playerError && !isLiveWaiting && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 pointer-events-none backdrop-blur-xs">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-2.5 drop-shadow-md" />
          <span className="text-xs font-bold text-pink-200 tracking-wider uppercase">
            Loading Stream...
          </span>
        </div>
      )}

      {/* 6. Live Class Waiting Room (Scheduled Live Classes) */}
      {isLiveWaiting && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 via-pink-950/50 to-slate-950">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white flex items-center justify-center shadow-xl shadow-pink-500/30 mb-4 animate-pulse">
            <Video className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-xs font-extrabold mb-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>LIVE CLASSROOM SCHEDULED</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-white mb-1.5 max-w-lg leading-snug">
            {title}
          </h3>
          <p className="text-xs text-pink-300 font-semibold mb-3">
            {facultyName ? `Faculty: ${facultyName} · ` : ''}
            {liveScheduleTime || 'Starting on Time'}
          </p>
          <p className="text-xs text-slate-300 max-w-md mb-5 leading-relaxed">
            This live lecture streams directly in your app on time. Keep this page open; auto-checking for the live broadcast in{' '}
            <span className="font-mono font-bold text-pink-400 text-sm">{retryCountdown}s</span>...
          </p>
          <button
            onClick={onRetryStream}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Check Live Stream Now</span>
          </button>
        </div>
      )}

      {/* 7. Player Error State */}
      {playerError && !isLiveWaiting && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Cannot Play Video</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">{playerError}</p>
          <button
            onClick={onRetryStream}
            className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-md"
          >
            Retry Video
          </button>
        </div>
      )}

      {/* 8. Top Watermark & Live Badge (Always accessible) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 pointer-events-none">
        {isLive && !isLiveWaiting && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-extrabold tracking-wider shadow-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {/* 9. Settings Menus (Speed, Quality, Main Settings) */}
      {activeMenu !== 'none' && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-4 bottom-16 z-40 bg-slate-900/95 border border-pink-900/80 rounded-2xl p-2 shadow-2xl backdrop-blur-md min-w-[200px] text-white animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {/* Main Settings Menu */}
          {activeMenu === 'settings' && (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Playback Settings
              </div>

              {/* Speed Menu Trigger */}
              <button
                onClick={() => setActiveMenu('speed')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-pink-400" />
                  <span>Playback Speed</span>
                </div>
                <div className="flex items-center gap-1 text-pink-400 font-semibold">
                  <span>{playbackSpeed}x</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Quality Menu Trigger */}
              <button
                onClick={() => setActiveMenu('quality')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-pink-400" />
                  <span>Stream Quality</span>
                </div>
                <div className="flex items-center gap-1 text-pink-400 font-semibold">
                  <span>{selectedQuality}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          )}

          {/* Speed Submenu */}
          {activeMenu === 'speed' && (
            <div className="space-y-1">
              <button
                onClick={() => setActiveMenu('settings')}
                className="w-full flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-pink-400 hover:text-pink-300 border-b border-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {PLAYBACK_SPEEDS.map((spd) => {
                  const isCur = playbackSpeed === spd;
                  return (
                    <button
                      key={spd}
                      onClick={() => handleSpeedSelect(spd)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                        isCur
                          ? 'bg-pink-600 text-white font-bold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{spd === 1 ? 'Normal (1x)' : `${spd}x`}</span>
                      {isCur && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quality Submenu */}
          {activeMenu === 'quality' && (
            <div className="space-y-1">
              <button
                onClick={() => setActiveMenu('settings')}
                className="w-full flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-pink-400 hover:text-pink-300 border-b border-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {streams.length === 0 ? (
                  <div className="p-2 text-xs text-slate-400">Default Quality</div>
                ) : (
                  streams.map((st) => {
                    const isCur = selectedQuality === st.label;
                    return (
                      <button
                        key={st.label}
                        onClick={() => handleQualitySelect(st.label)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                          isCur
                            ? 'bg-pink-600 text-white font-bold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{st.label}</span>
                        {isCur && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10. Main Interactive Video Controls Overlay Bar */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4.5 flex flex-col gap-2 transition-opacity duration-300 ${
          showControls || !isPlaying || activeMenu !== 'none' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber with Buffered Bar & Hover Preview */}
        <div 
          className="relative group/scrub py-2 cursor-pointer flex items-center"
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={handleScrubberMouseLeave}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            handleSeek(clickPos * duration);
          }}
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && duration > 0 && (
            <div 
              style={{ left: `${hoverPosition}%` }}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 border border-pink-400/40 text-[11px] font-mono text-white shadow-md pointer-events-none whitespace-nowrap"
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Track Base */}
          <div className="relative w-full h-1.5 group-hover/scrub:h-2.5 bg-slate-700/80 rounded-full overflow-hidden transition-all duration-150">
            {/* Buffered progress */}
            <div 
              style={{ width: `${bufferedPercentage}%` }}
              className="absolute top-0 bottom-0 left-0 bg-slate-500/60 rounded-full transition-all duration-150"
            />
            {/* Played progress */}
            <div 
              style={{ width: `${progressPercentage}%` }}
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-pink-600 to-rose-500 rounded-full transition-all duration-75"
            />
          </div>

          {/* Thumb dot */}
          <div 
            style={{ left: `${progressPercentage}%` }}
            className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md ring-2 ring-pink-500 scale-0 group-hover/scrub:scale-100 transition-transform pointer-events-none"
          />
        </div>

        {/* Bottom Action Controls Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 text-white">
          
          {/* Left Controls: Play/Pause, Next/Prev, Skip 10s, Volume, Time */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            
            {/* Play / Pause Button */}
            <button
              onClick={togglePlay}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 text-white transition-colors focus:outline-none"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current" />
              ) : (
                <Play className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Previous Lecture Button (if in playlist) */}
            {onPrevLecture && (
              <button
                onClick={onPrevLecture}
                className="hidden md:inline-flex p-1.5 rounded-xl hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                title={`Previous: ${prevLectureTitle || 'Previous Class'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Skip Rewind 10s */}
            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Rewind 10 seconds (J / Left Arrow)"
            >
              <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Skip Forward 10s */}
            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Forward 10 seconds (L / Right Arrow)"
            >
              <RotateCw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Next Lecture Button (if in playlist) */}
            {onNextLecture && (
              <button
                onClick={onNextLecture}
                className="hidden md:inline-flex p-1.5 rounded-xl hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                title={`Next: ${nextLectureTitle || 'Next Class'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Volume Control Slider */}
            <div className="hidden sm:flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-xl hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeInput}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
                aria-label="Volume Slider"
              />
            </div>

            {/* Timestamp Display */}
            <div className="text-[11px] sm:text-xs font-mono text-slate-300 shrink-0 ml-1">
              <span className="font-semibold text-white">{formatTime(currentTime)}</span>
              <span className="mx-1 text-slate-500">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Quality, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Quick Speed Pill Button */}
            <button
              onClick={() => setActiveMenu(activeMenu === 'speed' ? 'none' : 'speed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeMenu === 'speed' || playbackSpeed !== 1
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Playback Speed (< / >)"
            >
              {playbackSpeed}x
            </button>

            {/* Quality / Settings Button */}
            <button
              onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')}
              className={`p-1.5 sm:p-2 rounded-xl transition-all ${
                activeMenu !== 'none'
                  ? 'bg-pink-600 text-white'
                  : 'hover:bg-white/20 text-slate-300 hover:text-white'
              }`}
              title="Quality & Settings"
              aria-label="Playback Settings"
            >
              <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Picture in Picture Button */}
            {document.pictureInPictureEnabled && (
              <button
                onClick={togglePiP}
                className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-xl hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                title="Picture in Picture (P)"
                aria-label="Picture in Picture"
              >
                <PictureInPicture2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : (
                <Maximize className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
