import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, FileText, Send, Clock, Download, Plus, 
  Trash2, ChevronRight, ChevronLeft, Sparkles, BookOpen
} from 'lucide-react';
import { Batch, Lecture, TimedNote, VideoStream } from '../types';
import { 
  fetchVideoDetails, parseVideoStreams, extractPdfUrl 
} from '../services/api';
import { TELEGRAM_URL, APP_LOGO } from './TelegramModal';
import { VideoPlayer } from './VideoPlayer';

interface LecturePlayerProps {
  batch: Batch;
  lecture: Lecture;
  playlist: Lecture[];
  onBack: () => void;
  onSelectLecture: (lec: Lecture) => void;
  onOpenPdf: (title: string, pdfUrl: string) => void;
  onOpenTelegram: () => void;
}

export const LecturePlayer: React.FC<LecturePlayerProps> = ({
  batch,
  lecture,
  playlist,
  onBack,
  onSelectLecture,
  onOpenPdf,
  onOpenTelegram,
}) => {
  // Stream & Details State
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<VideoStream[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [detailedLecture, setDetailedLecture] = useState<Lecture | null>(null);
  const [pdfLink, setPdfLink] = useState<string>('');
  const [isLiveWaiting, setIsLiveWaiting] = useState<boolean>(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(15);

  // Time tracking for notes
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const seekToRef = useRef<((time: number) => void) | null>(null);

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
    const currentSecs = Math.floor(currentTime);
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
    if (seekToRef.current) {
      seekToRef.current(secs);
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
        // If this is a live / upcoming lecture, show the live waiting room instead of a fatal error
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

  // Find currentIndex in playlist for next/prev
  const currentIndex = playlist.findIndex((l) => l.id === lecture.id);
  const prevLecture = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const nextLecture = currentIndex >= 0 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Header / Breadcrumb Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 border-b border-pink-900/40 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-pink-950/80 hover:bg-pink-900 text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0 min-h-[40px] touch-manipulation border border-pink-800/40"
              aria-label="Back to Course"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Course</span>
            </button>

            <div className="truncate min-w-0">
              <div className="flex items-center gap-2">
                {lecture.is_live && (
                  <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold tracking-wider animate-pulse shrink-0">
                    LIVE
                  </span>
                )}
                <h2 className="text-xs sm:text-sm font-bold text-white truncate" title={lecture.Title}>
                  {lecture.Title}
                </h2>
              </div>
              <p className="text-[10px] sm:text-[11px] text-pink-300/80 truncate">
                {batch.course_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pdfLink && (
              <button
                onClick={() => onOpenPdf(lecture.Title, pdfLink)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-xs shrink-0 min-h-[38px] touch-manipulation"
                title="View PDF notes for this class"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Class Notes</span>
                <span className="sm:hidden">PDF</span>
              </button>
            )}

            <button
              onClick={onOpenTelegram}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-pink-400 text-xs font-semibold border border-pink-900/50 transition-colors shrink-0 min-h-[38px] touch-manipulation"
            >
              <Send className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Telegram</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Player (Left/Center) + Side Drawer (Right) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column: Video Stage & Controls (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Professional Video Player Container */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-pink-950/80 bg-black">
            <VideoPlayer
              title={lecture.Title}
              courseName={batch.course_name}
              streams={availableStreams}
              selectedQuality={selectedQuality}
              onQualityChange={(q) => setSelectedQuality(q)}
              isLive={!!lecture.is_live}
              isLiveWaiting={isLiveWaiting}
              liveScheduleTime={lecture.date_and_time || lecture.start_date}
              facultyName={lecture.faculty_name}
              onRetryStream={loadVideoStreams}
              retryCountdown={retryCountdown}
              prevLectureTitle={prevLecture?.Title}
              nextLectureTitle={nextLecture?.Title}
              onPrevLecture={prevLecture ? () => onSelectLecture(prevLecture) : undefined}
              onNextLecture={nextLecture ? () => onSelectLecture(nextLecture) : undefined}
              onTimeUpdateCallback={(curr, dur) => {
                setCurrentTime(curr);
                setDuration(dur);
              }}
              onSeekRequested={(seekFn) => {
                seekToRef.current = seekFn;
              }}
            />
          </div>

          {/* Under-player Info & Next/Prev Controls */}
          <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-pink-950/60 shadow-lg space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-pink-950/80 border border-pink-800/50 text-pink-300 text-[10px] font-bold">
                    Class #{currentIndex >= 0 ? currentIndex + 1 : 1} of {playlist.length || 1}
                  </span>
                  {lecture.is_live && (
                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold tracking-wider animate-pulse">
                      LIVE STREAM
                    </span>
                  )}
                  {lecture.faculty_name && (
                    <span className="text-xs text-slate-400">
                      Faculty: <span className="text-slate-200 font-medium">{lecture.faculty_name}</span>
                    </span>
                  )}
                </div>
                <h1 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {lecture.Title}
                </h1>
                <p className="text-xs text-pink-400/90 mt-0.5 font-medium">
                  {batch.course_name}
                </p>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={!prevLecture}
                  onClick={() => prevLecture && onSelectLecture(prevLecture)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] touch-manipulation ${
                    prevLecture
                      ? 'bg-slate-800 hover:bg-pink-950 text-pink-300 border border-pink-900/50 active:scale-95'
                      : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                  }`}
                  aria-label="Previous Lecture"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  disabled={!nextLecture}
                  onClick={() => nextLecture && onSelectLecture(nextLecture)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md min-h-[40px] touch-manipulation ${
                    nextLecture
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-500/20 active:scale-95'
                      : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                  }`}
                  aria-label="Next Lecture"
                >
                  <span>Next Class</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
              {pdfLink && (
                <button
                  onClick={() => onOpenPdf(lecture.Title, pdfLink)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-xs min-h-[38px] touch-manipulation"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open PDF Handout</span>
                </button>
              )}

              <button
                onClick={onOpenTelegram}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-pink-300 text-xs font-semibold border border-pink-900/40 transition-colors min-h-[38px] touch-manipulation"
              >
                <Send className="w-3.5 h-3.5 text-pink-400" />
                <span>Ask Doubt on Telegram</span>
              </button>

              <div className="text-[11px] text-slate-400 ml-auto flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>Full HD Stream · 100% Free</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Playlist / Timed Notes Tab Deck (4 cols on lg) */}
        <div className="lg:col-span-4 bg-slate-900/90 rounded-2xl border border-pink-950/60 flex flex-col h-[520px] sm:h-[600px] overflow-hidden shadow-xl">
          
          {/* Deck Tabs */}
          <div className="flex items-center border-b border-pink-950/80 p-2 bg-slate-950/70">
            <button
              onClick={() => setActiveTab('playlist')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all text-center min-h-[38px] touch-manipulation ${
                activeTab === 'playlist'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Classes ({playlist.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all text-center min-h-[38px] touch-manipulation ${
                activeTab === 'notes'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              My Notes ({notes.length})
            </button>
          </div>

          {/* Deck Body */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-800/60 custom-scrollbar">
            
            {/* Tab: Playlist */}
            {activeTab === 'playlist' && (
              <div className="space-y-1.5 pt-1">
                {playlist.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-700 mb-2 stroke-1" />
                    <p>No other lectures in this chapter.</p>
                  </div>
                ) : (
                  playlist.map((lec, idx) => {
                    const isCurrent = lec.id === lecture.id;
                    return (
                      <button
                        key={lec.id || idx}
                        onClick={() => onSelectLecture(lec)}
                        className={`w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all group touch-manipulation ${
                          isCurrent
                            ? 'bg-pink-950/80 border border-pink-600/60 text-white shadow-xs'
                            : 'hover:bg-slate-800/60 text-slate-300 active:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCurrent ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 group-hover:text-pink-400'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold truncate group-hover:text-pink-300 transition-colors">
                            {lec.Title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {isCurrent ? (
                              <span className="text-pink-400 font-bold">Now Playing</span>
                            ) : (
                              <span>Class #{idx + 1}</span>
                            )}
                            {lec.pdf_link && <span>· PDF Available</span>}
                          </div>
                        </div>

                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 animate-ping" />
                        )}
                      </button>
                    );
                  })
                )}
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
                        className="text-pink-300 hover:text-white flex items-center gap-1 py-1 px-2 rounded-md hover:bg-slate-800 transition-colors"
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
                      placeholder="Type formula, definition, or doubt..."
                      className="flex-1 bg-slate-950 border border-pink-900/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-3.5 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center justify-center min-h-[38px] touch-manipulation"
                      title="Save note"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {notes.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      <Clock className="w-8 h-8 mx-auto text-slate-700 mb-2 stroke-1" />
                      <p>No notes saved for this lecture yet.</p>
                      <p className="text-[11px] text-slate-600 mt-1 max-w-xs mx-auto">
                        Pause the lecture anytime and write down key concepts. Click any note to jump directly to that exact moment!
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-pink-900/60 transition-colors flex items-start justify-between gap-2 group"
                      >
                        <div className="min-w-0">
                          <button
                            onClick={() => handleSeekTo(note.timeSeconds)}
                            className="text-[11px] font-mono font-bold text-pink-400 hover:text-pink-300 hover:underline flex items-center gap-1 mb-1 transition-colors"
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
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors shrink-0 rounded-lg hover:bg-slate-800"
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
            <span className="font-medium text-slate-300">GB STUDY Player</span>
            <a 
              href={TELEGRAM_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-pink-400 hover:underline font-semibold flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>@GBFreestudy</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
