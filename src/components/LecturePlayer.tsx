import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  ArrowLeft, Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, 
  Maximize, Settings, FileText, Send, Clock, Download, Plus, 
  Trash2, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Loader2, AlertCircle, Video
} from 'lucide-react';
import { Batch, Lecture, TimedNote, VideoStream } from '../types';
import { 
  fetchVideoDetails, parseVideoStreams, getProxiedStreamUrl, extractPdfUrl 
} from '../services/api';
import { TELEGRAM_URL, APP_LOGO } from './TelegramModal';

interface LecturePlayerProps {
  batch: Batch;
  lecture: Lecture;
  playlist: Lecture[];
  onBack: () => void;
  onSelectLecture: (lec: Lecture) => void;
  onOpenPdf: (title: string, pdfUrl: string) => void;
  onOpenTelegram: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const LecturePlayer: React.FC<LecturePlayerProps> = ({
  batch,
  lecture,
  playlist,
  onBack,
  onSelectLecture,
  onOpenPdf,
  onOpenTelegram,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stream & Details State
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<VideoStream[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [detailedLecture, setDetailedLecture] = useState<Lecture | null>(null);
  const [pdfLink, setPdfLink] = useState<string>('');

  // Player controls state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [buffering, setBuffering] = useState<boolean>(true);

  // Tab & Notes state
  const [activeTab, setActiveTab] = useState<'playlist' | 'notes' | 'info'>('playlist');
  const [notes, setNotes] = useState<TimedNote[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');

  // Format seconds to mm:ss or hh:mm:ss
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

  // 1. Load saved notes from localStorage
  useEffect(() => {
    const storageKey = `gb_study_notes_${lecture.id}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotes(JSON.parse(saved));
      } else {
        setNotes([]);
      }
    } catch {
      setNotes([]);
    }
  }, [lecture.id]);

  // Save notes to localStorage
  const saveNotes = (updated: TimedNote[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(`gb_study_notes_${lecture.id}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save notes:', err);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const currentSecs = videoRef.current ? Math.floor(videoRef.current.currentTime) : Math.floor(currentTime);
    const newNote: TimedNote = {
      id: Date.now().toString(),
      videoId: lecture.id,
      timeSeconds: currentSecs,
      formattedTime: formatTime(currentSecs),
      text: newNoteText.trim(),
      createdAt: Date.now(),
    };
    const updated = [...notes, newNote].sort((a, b) => a.timeSeconds - b.timeSeconds);
    saveNotes(updated);
    setNewNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    saveNotes(notes.filter((n) => n.id !== noteId));
  };

  const handleSeekTo = (secs: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = secs;
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleExportNotes = () => {
    if (notes.length === 0) return;
    let md = `# Lecture Notes: ${lecture.Title}\nBatch: ${batch.course_name}\nDate: ${new Date().toLocaleDateString()}\n\n`;
    notes.forEach((n) => {
      md += `- [${n.formattedTime}] ${n.text}\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GB_STUDY_notes_${lecture.Title.slice(0, 25).replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isLiveWaiting, setIsLiveWaiting] = useState<boolean>(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(15);

  // 2. Fetch Video Details & Resolve Streams
  const loadVideoStreams = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsLiveWaiting(false);
    try {
      let detailed: Lecture | null = null;
      try {
        detailed = await fetchVideoDetails(batch.id, lecture.id);
        if (detailed) setDetailedLecture(detailed);
      } catch (err) {
        console.warn('Error fetching video details:', err);
      }

      // Check PDF links
      const foundPdf = detailed?.pdf_link || detailed?.pdf_link2 || lecture.pdf_link || lecture.pdf_link2 || '';
      if (foundPdf) {
        setPdfLink(extractPdfUrl(foundPdf));
      } else {
        setPdfLink('');
      }

      // Parse streams
      const streams = parseVideoStreams(lecture, detailed);
      if (streams.length === 0) {
        // If this is a live / upcoming lecture, show the live waiting room instead of a fatal error!
        if (lecture.is_live || lecture.start_date || lecture.date_and_time || detailed?.is_live) {
          setIsLiveWaiting(true);
          setLoading(false);
          return;
        }
        throw new Error('No playable stream found for this lecture. Please check back shortly.');
      }

      setAvailableStreams(streams);
      // Select best quality or first available
      setSelectedQuality(streams[0].label);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load video:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load video stream.');
      setLoading(false);
    }
  }, [batch.id, lecture]);

  useEffect(() => {
    loadVideoStreams();
  }, [loadVideoStreams]);

  // Auto-retry polling when in Live Waiting Room
  useEffect(() => {
    if (!isLiveWaiting) return;
    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          loadVideoStreams();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLiveWaiting, loadVideoStreams]);

  // 3. Initialize HLS or Native Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedQuality || availableStreams.length === 0) return;

    const currentStream = availableStreams.find((s) => s.label === selectedQuality) || availableStreams[0];
    if (!currentStream || !currentStream.url) return;

    const streamUrl = getProxiedStreamUrl(currentStream.url);
    const prevTime = video.currentTime > 0 ? video.currentTime : 0;
    const wasPlaying = !video.paused;

    setBuffering(true);

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (currentStream.isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 90,
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setBuffering(false);
        if (prevTime > 0) video.currentTime = prevTime;
        if (wasPlaying) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              hls.destroy();
              break;
          }
        }
      });
    } else {
      // Native browser HLS (e.g. Safari / mobile iOS) or MP4 fallback
      video.src = streamUrl;
      video.addEventListener(
        'loadedmetadata',
        () => {
          setBuffering(false);
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
  }, [selectedQuality, availableStreams]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
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
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeekScrubber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettings(false);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Find currentIndex in playlist for next/prev
  const currentIndex = playlist.findIndex((l) => l.id === lecture.id);
  const prevLecture = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const nextLecture = currentIndex >= 0 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Header / Breadcrumb Bar */}
      <div className="bg-slate-900 border-b border-pink-900/40 px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-pink-950 hover:bg-pink-900 text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Course</span>
            </button>

            <div className="truncate min-w-0">
              <div className="flex items-center gap-2">
                {lecture.is_live && (
                  <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold tracking-wider animate-pulse shrink-0">
                    LIVE
                  </span>
                )}
                <h2 className="text-sm font-bold text-white truncate" title={lecture.Title}>
                  {lecture.Title}
                </h2>
              </div>
              <p className="text-[11px] text-pink-300/80 truncate">
                {batch.course_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pdfLink && (
              <button
                onClick={() => onOpenPdf(lecture.Title, pdfLink)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600/90 hover:bg-pink-500 text-white text-xs font-semibold transition-colors"
                title="View PDF notes for this class"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Class Notes</span>
              </button>
            )}

            <button
              onClick={onOpenTelegram}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-400 text-xs font-semibold border border-pink-900/50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Telegram</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Player (Left/Center) + Side Drawer (Right) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video Stage & Controls (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Video Container */}
          <div 
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-pink-950 group select-none flex items-center justify-center"
          >
            {/* Live Waiting Room or Loading or Error Overlay */}
            {isLiveWaiting ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 via-pink-950/40 to-slate-950">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 mb-4 animate-pulse">
                  <Video className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-xs font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>LIVE CLASS SCHEDULED</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 max-w-lg">{lecture.Title}</h3>
                <p className="text-xs text-pink-300 font-semibold mb-3">
                  {lecture.faculty_name ? `Educator: ${lecture.faculty_name} · ` : ''}
                  {lecture.date_and_time || lecture.start_date || 'Class Time'}
                </p>
                <p className="text-xs text-slate-300 max-w-md mb-5 leading-relaxed">
                  This live class streams directly inside GB STUDY on time. Keep this screen open; checking for live signal in{' '}
                  <span className="font-mono font-bold text-pink-400">{retryCountdown}s</span>...
                </p>
                <button
                  onClick={() => loadVideoStreams()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Check Live Stream Now</span>
                </button>
              </div>
            ) : buffering && !errorMsg ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-2" />
                <span className="text-xs text-pink-200 font-medium tracking-wide">
                  Buffering Stream...
                </span>
              </div>
            ) : null}

            {/* Error Overlay */}
            {errorMsg && !isLiveWaiting ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">Cannot Play Video</h3>
                <p className="text-xs text-slate-400 max-w-md mb-4">{errorMsg}</p>
                <button
                  onClick={loadVideoStreams}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
                >
                  Retry Loading
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                playsInline
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
                className="w-full h-full object-contain cursor-pointer"
              />
            )}

            {/* Live Indicator Pill on top-left of video stage */}
            {lecture.is_live && !isLiveWaiting && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-extrabold tracking-wider shadow-md animate-pulse pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>LIVE</span>
              </div>
            )}

            {/* Custom Video Controls Bar (Overlay) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 opacity-95 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex flex-col gap-2">
              
              {/* Pink Progress Bar Scrubber */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeekScrubber}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 focus:outline-none"
                />
              </div>

              {/* Bottom Control Row */}
              <div className="flex items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-2 sm:gap-3">
                  
                  {/* Play / Pause */}
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  {/* Skip Rewind 10s */}
                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Skip Forward 10s */}
                  <button
                    onClick={() => handleSkip(10)}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                    title="Forward 10 seconds"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume / Mute */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>

                  {/* Timestamp Display */}
                  <div className="text-[11px] sm:text-xs font-mono text-slate-300 pl-1">
                    <span>{formatTime(currentTime)}</span>
                    <span className="mx-1 text-slate-500">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right controls: Quality & Settings & Fullscreen */}
                <div className="flex items-center gap-2 relative">
                  
                  {/* Quality selector dropdown */}
                  {availableStreams.length > 1 && (
                    <select
                      value={selectedQuality}
                      onChange={(e) => setSelectedQuality(e.target.value)}
                      className="bg-black/60 border border-pink-900/60 rounded-md px-2 py-1 text-xs text-pink-300 font-semibold focus:outline-none cursor-pointer"
                    >
                      {availableStreams.map((s) => (
                        <option key={s.label} value={s.label} className="bg-slate-900 text-white">
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Speed button & menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                      title="Playback Speed"
                    >
                      {playbackSpeed}x
                    </button>

                    {showSettings && (
                      <div className="absolute right-0 bottom-full mb-2 bg-slate-900 border border-pink-900 rounded-xl p-1.5 shadow-xl min-w-[90px] z-30 space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">Speed</div>
                        {SPEED_OPTIONS.map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`w-full text-left px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                              playbackSpeed === speed ? 'bg-pink-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                    aria-label="Toggle Fullscreen"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Under-player Info & Next/Prev Controls */}
          <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-pink-950/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white">
                  {lecture.Title}
                </h1>
                <p className="text-xs text-pink-400/90 mt-0.5">
                  {batch.course_name}
                </p>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={!prevLecture}
                  onClick={() => prevLecture && onSelectLecture(prevLecture)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    prevLecture
                      ? 'bg-slate-800 hover:bg-pink-950 text-pink-300 border border-pink-900/50'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  disabled={!nextLecture}
                  onClick={() => nextLecture && onSelectLecture(nextLecture)}
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    nextLecture
                      ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-xs'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <span>Next Class</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-3">
              {pdfLink && (
                <button
                  onClick={() => onOpenPdf(lecture.Title, pdfLink)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open PDF Handout</span>
                </button>
              )}

              <button
                onClick={onOpenTelegram}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-300 text-xs font-semibold border border-pink-900/40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask Doubt in Telegram</span>
              </button>

              <span className="text-xs text-slate-500 ml-auto">
                Class Stream · 100% Free Access
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Playlist / Timed Notes Tab Deck (4 cols on lg) */}
        <div className="lg:col-span-4 bg-slate-900 rounded-2xl border border-pink-950/60 flex flex-col h-[600px] overflow-hidden">
          
          {/* Deck Tabs */}
          <div className="flex items-center border-b border-pink-950/80 p-2 bg-slate-950/60">
            <button
              onClick={() => setActiveTab('playlist')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors text-center ${
                activeTab === 'playlist'
                  ? 'bg-pink-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Classes ({playlist.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors text-center ${
                activeTab === 'notes'
                  ? 'bg-pink-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Notes ({notes.length})
            </button>
          </div>

          {/* Deck Body */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-800/60">
            
            {/* Tab: Playlist */}
            {activeTab === 'playlist' && (
              <div className="space-y-1 pt-1">
                {playlist.map((lec, idx) => {
                  const isCurrent = lec.id === lecture.id;
                  return (
                    <button
                      key={lec.id || idx}
                      onClick={() => onSelectLecture(lec)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all group ${
                        isCurrent
                          ? 'bg-pink-950/80 border border-pink-600/50 text-white shadow-xs'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCurrent ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-pink-400'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold truncate group-hover:text-pink-300 transition-colors">
                          {lec.Title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          {isCurrent ? (
                            <span className="text-pink-400 font-bold">Now Playing</span>
                          ) : (
                            <span>Class #{idx + 1}</span>
                          )}
                          {lec.pdf_link && <span>· PDF Available</span>}
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab: Timed Personal Notes */}
            {activeTab === 'notes' && (
              <div className="flex flex-col h-full space-y-3 pt-2">
                
                {/* Note creation box */}
                <form onSubmit={handleAddNote} className="space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-[11px] text-pink-400 font-medium">
                    <span>Add note at current time ({formatTime(currentTime)})</span>
                    {notes.length > 0 && (
                      <button
                        type="button"
                        onClick={handleExportNotes}
                        className="text-pink-300 hover:text-white flex items-center gap-1"
                        title="Download notes as Markdown"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Type personal concept or formula note..."
                      className="flex-1 bg-slate-950 border border-pink-900/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-3 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {notes.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      <Clock className="w-8 h-8 mx-auto text-slate-700 mb-2 stroke-1" />
                      <p>No notes saved yet.</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Pause or play video and jot down key exam points. They will be saved to your browser automatically!
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-pink-900/60 transition-colors flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <button
                            onClick={() => handleSeekTo(note.timeSeconds)}
                            className="text-[11px] font-mono font-bold text-pink-400 hover:underline flex items-center gap-1 mb-1"
                            title="Click to jump to this video timestamp"
                          >
                            <Clock className="w-3 h-3" />
                            <span>{note.formattedTime}</span>
                          </button>
                          <p className="text-xs text-slate-200 leading-snug break-words">
                            {note.text}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Bottom Card Footer */}
          <div className="p-3 bg-slate-950/90 border-t border-pink-950/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>GB STUDY Player</span>
            <a 
              href={TELEGRAM_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-pink-400 hover:underline font-semibold"
            >
              @GBFreestudy
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
