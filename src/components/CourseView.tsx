import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BookOpen, PlayCircle, FileText, ChevronRight, 
  Search, Loader2, Sparkles, FolderOpen, Video, ExternalLink, Send
} from 'lucide-react';
import { Batch, Subject, Topic, Lecture, LiveUpcomingVideo } from '../types';
import { 
  fetchSubjects, fetchTopics, fetchVideos, fetchLiveUpcoming, 
  fetchPreviousLiveVideos, extractPdfUrl 
} from '../services/api';
import { TELEGRAM_URL, APP_LOGO } from './TelegramModal';

interface CourseViewProps {
  batch: Batch;
  onBack: () => void;
  onSelectLecture: (lecture: Lecture, allTopicLectures: Lecture[]) => void;
  onOpenPdf: (title: string, pdfUrl: string) => void;
  onOpenTelegram: () => void;
}

export const CourseView: React.FC<CourseViewProps> = ({
  batch,
  onBack,
  onSelectLecture,
  onOpenPdf,
  onOpenTelegram,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(false);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const [topicLectures, setTopicLectures] = useState<Record<string, Lecture[]>>({});
  const [loadingLectures, setLoadingLectures] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState<'syllabus' | 'notes' | 'live'>('syllabus');
  const [liveVideos, setLiveVideos] = useState<LiveUpcomingVideo[]>([]);
  const [previousLiveVideos, setPreviousLiveVideos] = useState<Lecture[]>([]);
  const [loadingLive, setLoadingLive] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Fetch Subjects when batch changes
  useEffect(() => {
    let isMounted = true;
    setLoadingSubjects(true);
    fetchSubjects(batch.id)
      .then((data) => {
        if (isMounted) {
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubject(data[0]);
          }
          setLoadingSubjects(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingSubjects(false);
      });

    // Also fetch live/upcoming sessions AND previous live broadcasts
    setLoadingLive(true);
    Promise.all([
      fetchLiveUpcoming(batch.id),
      fetchPreviousLiveVideos(batch.id),
    ]).then(([lives, previous]) => {
      if (isMounted) {
        setLiveVideos(lives);
        setPreviousLiveVideos(previous);
        setLoadingLive(false);
      }
    }).catch(() => {
      if (isMounted) setLoadingLive(false);
    });

    return () => {
      isMounted = false;
    };
  }, [batch.id]);

  // 2. Fetch Topics when selected subject changes
  useEffect(() => {
    if (!selectedSubject) return;
    let isMounted = true;
    setLoadingTopics(true);
    fetchTopics(batch.id, selectedSubject.subjectid)
      .then((data) => {
        if (isMounted) {
          setTopics(data);
          setLoadingTopics(false);
          // Auto-expand first topic if available
          if (data.length > 0) {
            const firstId = data[0].topicid;
            setExpandedTopicId(firstId);
            loadLecturesForTopic(firstId);
          }
        }
      })
      .catch(() => {
        if (isMounted) setLoadingTopics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [batch.id, selectedSubject]);

  // 3. Load Lectures for a specific Topic
  const loadLecturesForTopic = async (topicId: string) => {
    if (topicLectures[topicId] && topicLectures[topicId].length > 0) return;
    if (!selectedSubject) return;

    setLoadingLectures((prev) => ({ ...prev, [topicId]: true }));
    try {
      const lectures = await fetchVideos(batch.id, selectedSubject.subjectid, topicId);
      setTopicLectures((prev) => ({ ...prev, [topicId]: lectures }));
    } finally {
      setLoadingLectures((prev) => ({ ...prev, [topicId]: false }));
    }
  };

  const handleToggleTopic = (topicId: string) => {
    if (expandedTopicId === topicId) {
      setExpandedTopicId(null);
    } else {
      setExpandedTopicId(topicId);
      loadLecturesForTopic(topicId);
    }
  };

  const filteredTopics = topics.filter((t) =>
    t.topic_name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-pink-50/20 pb-16">
      
      {/* Course Header Banner */}
      <div className="bg-gradient-to-r from-pink-900 via-rose-900 to-slate-900 text-white border-b border-pink-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-pink-300 mb-6 font-medium">
            <button
              onClick={onBack}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Batches</span>
            </button>
            <span>/</span>
            <span className="text-white font-semibold truncate max-w-[280px] sm:max-w-md">
              {batch.course_name}
            </span>
          </nav>

          {/* Banner Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left: Thumbnail */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="aspect-video sm:aspect-4/3 w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-pink-400/40 bg-slate-800">
                <img
                  src={batch.course_thumbnail}
                  alt={batch.course_name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = APP_LOGO;
                  }}
                />
              </div>
            </div>

            {/* Right: Info & Actions */}
            <div className="md:col-span-8 lg:col-span-9 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-pink-600 text-white text-xs font-bold tracking-wide">
                  {batch.category || 'Batch'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  100% Free · No Login
                </span>
                <span className="text-xs text-pink-200">
                  ID: #{batch.id}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {batch.course_name}
              </h1>

              <p className="text-xs sm:text-sm text-pink-100 max-w-2xl leading-relaxed">
                {batch.description}
              </p>

              {/* Action buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    // Start first available lecture if topics exist
                    if (topics.length > 0 && expandedTopicId) {
                      const lectures = topicLectures[expandedTopicId] || [];
                      if (lectures.length > 0) {
                        onSelectLecture(lectures[0], lectures);
                        return;
                      }
                    }
                    setActiveTab('syllabus');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02]"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Start First Lecture</span>
                </button>

                <button
                  onClick={onOpenTelegram}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-pink-400/40 text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  <Send className="w-4 h-4 text-pink-300" />
                  <span>Batch Telegram Group</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Course Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Navigation Tabs (Syllabus, Notes, Live Classes) */}
        <div className="flex items-center gap-2 border-b border-pink-200 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'syllabus'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                : 'bg-white text-slate-600 hover:text-pink-600 border border-pink-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Subjects & Lectures</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'notes'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                : 'bg-white text-slate-600 hover:text-pink-600 border border-pink-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF Notes Handouts</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                : 'bg-white text-slate-600 hover:text-pink-600 border border-pink-100'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Live Classes ({liveVideos.length + previousLiveVideos.length})</span>
            {liveVideos.some((l) => l.is_live) && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
            )}
          </button>
        </div>

        {/* Tab 1: Syllabus & Lectures */}
        {activeTab === 'syllabus' && (
          <div className="space-y-6">
            
            {/* Subject Selector Bar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Subject
                </h3>
                {subjects.length > 0 && (
                  <span className="text-xs text-pink-600 font-semibold">
                    {subjects.length} Subjects in this Batch
                  </span>
                )}
              </div>

              {loadingSubjects ? (
                <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-pink-100">
                  <Loader2 className="w-6 h-6 text-pink-600 animate-spin mr-2" />
                  <span className="text-xs text-slate-600 font-medium">Loading subjects...</span>
                </div>
              ) : subjects.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-pink-100 text-slate-500 text-sm">
                  No subjects found for this batch.
                </div>
              ) : (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {subjects.map((sub) => {
                    const isSelected = selectedSubject?.subjectid === sub.subjectid;
                    return (
                      <button
                        key={sub.subjectid}
                        onClick={() => setSelectedSubject(sub)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                          isSelected
                            ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-500/25 scale-[1.02]'
                            : 'bg-white text-slate-700 hover:text-pink-600 hover:bg-pink-50 border-pink-200'
                        }`}
                      >
                        {sub.subject_logo ? (
                          <img
                            src={sub.subject_logo}
                            alt={sub.subject_name}
                            className="w-5 h-5 rounded-md object-cover shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <FolderOpen className="w-4 h-4 shrink-0 text-pink-500" />
                        )}
                        <span className="whitespace-nowrap">{sub.subject_name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Subject Chapters & Lectures */}
            {selectedSubject && (
              <div className="bg-white rounded-2xl border border-pink-200 p-5 sm:p-6 shadow-xs space-y-5">
                
                {/* Search in Chapters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
                      {selectedSubject.subject_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {selectedSubject.subject_name} Chapters
                      </h2>
                      <p className="text-xs text-slate-500">
                        {topics.length} Chapter Topics Available
                      </p>
                    </div>
                  </div>

                  <div className="relative sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter chapters..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-pink-50/50 border border-pink-200 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Topics Accordion List */}
                {loadingTopics ? (
                  <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-pink-600 animate-spin" />
                    <span className="text-xs font-medium">Fetching chapters and lectures...</span>
                  </div>
                ) : filteredTopics.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No chapters match "{searchFilter}".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTopics.map((topic) => {
                      const isExpanded = expandedTopicId === topic.topicid;
                      const lectures = topicLectures[topic.topicid] || [];
                      const isLoadingThis = loadingLectures[topic.topicid];

                      return (
                        <div
                          key={topic.topicid}
                          className="rounded-xl border border-pink-100 overflow-hidden bg-slate-50/50 transition-colors"
                        >
                          {/* Topic Header Toggle */}
                          <button
                            onClick={() => handleToggleTopic(topic.topicid)}
                            className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-pink-50/60 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 text-xs font-bold flex items-center justify-center shrink-0">
                                {topic.sortingparam || '•'}
                              </span>
                              <span className="text-sm font-semibold text-slate-800 truncate">
                                {topic.topic_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-medium text-slate-400">
                                {lectures.length > 0 ? `${lectures.length} Classes` : 'Click to View'}
                              </span>
                              <ChevronRight
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  isExpanded ? 'rotate-90 text-pink-600' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {/* Lectures List */}
                          {isExpanded && (
                            <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-pink-100 bg-white divide-y divide-pink-50">
                              {isLoadingThis ? (
                                <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                                  <Loader2 className="w-4 h-4 text-pink-600 animate-spin" />
                                  <span>Loading class video streams...</span>
                                </div>
                              ) : lectures.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400">
                                  No uploaded lectures found in this chapter.
                                </div>
                              ) : (
                                lectures.map((lecture, idx) => (
                                  <div
                                    key={lecture.id || idx}
                                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-pink-50/40 p-2 rounded-xl transition-colors group"
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                        <PlayCircle className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-pink-600 transition-colors">
                                          {lecture.Title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                          <span>Class {idx + 1}</span>
                                          <span>·</span>
                                          <span>{topic.topic_name}</span>
                                          {lecture.pdf_link && (
                                            <>
                                              <span>·</span>
                                              <span className="text-pink-600 font-semibold">PDF Available</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons in Pink */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                      {/* PDF Button if available */}
                                      {lecture.pdf_link && (
                                        <button
                                          onClick={() => onOpenPdf(lecture.Title, lecture.pdf_link!)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-300 hover:bg-pink-50 text-pink-600 text-xs font-semibold transition-colors"
                                          title="Open lecture notes PDF"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          <span>Handout</span>
                                        </button>
                                      )}

                                      {/* Watch Video Button */}
                                      <button
                                        onClick={() => onSelectLecture(lecture, lectures)}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-xs shadow-pink-500/20 transition-all hover:scale-[1.02]"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        <span>Play Video</span>
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: PDF Notes Handouts */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-2xl border border-pink-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Course Handouts & Chapter PDF Notes
                </h3>
                <p className="text-xs text-slate-500">
                  Direct classroom lecture PDFs verified for {batch.course_name}.
                </p>
              </div>
              <button
                onClick={onOpenTelegram}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Join Telegram for PDF Bank</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {topics.map((t, idx) => (
                <div
                  key={t.topicid}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-pink-100 bg-pink-50/30 hover:bg-pink-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={t.topic_name}>
                        {t.topic_name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {selectedSubject?.subject_name} · Notes Handout
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      // Fetch topic lectures to see if pdf exists
                      const lecs = topicLectures[t.topicid] || (await fetchVideos(batch.id, selectedSubject?.subjectid || '', t.topicid));
                      const withPdf = lecs.find((l) => l.pdf_link || l.pdf_link2);
                      if (withPdf) {
                        onOpenPdf(t.topic_name, withPdf.pdf_link || withPdf.pdf_link2!);
                      } else {
                        onOpenTelegram();
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs"
                  >
                    <span>View Handout</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Live & Upcoming Classes - Plays directly inside the app! */}
        {activeTab === 'live' && (
          <div className="bg-white rounded-2xl border border-pink-200 p-5 sm:p-6 shadow-xs space-y-6">
            <div className="border-b border-pink-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Live Lectures & Recorded Broadcasts
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-700 text-xs font-bold">
                    In-App Player
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Watch live streaming classes on time or replay previous live sessions directly inside GB STUDY.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-pink-600 font-semibold bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-pink-600 animate-pulse" />
                <span>Plays Directly in App</span>
              </div>
            </div>

            {loadingLive ? (
              <div className="py-12 flex items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 text-pink-600 animate-spin" />
                <span>Loading live classroom broadcasts...</span>
              </div>
            ) : liveVideos.length === 0 && previousLiveVideos.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Video className="w-10 h-10 mx-auto text-pink-300 mb-2 stroke-1" />
                <p className="text-sm font-semibold text-slate-700">No scheduled live classes right now.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  New live lectures will appear here when scheduled. You can watch all recorded subject lectures in the "Subjects & Lectures" tab!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Live Now & Upcoming Live Section */}
                {liveVideos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span>Live / Scheduled Classes ({liveVideos.length})</span>
                    </h4>

                    <div className="space-y-3">
                      {liveVideos.map((lv, i) => {
                        const lectureObj: Lecture = {
                          ...lv,
                          id: lv.id || `live_${i}`,
                          Title: lv.title || lv.Title || `Live Class #${i + 1}`,
                          is_live: true,
                        };

                        return (
                          <div
                            key={lv.id || i}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 border-pink-300 bg-gradient-to-r from-pink-50/80 via-white to-pink-50/40 gap-4 shadow-xs hover:border-pink-500 transition-all"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-pink-500/20">
                                <Video className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  {lv.is_live ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold tracking-wide animate-pulse">
                                      🔴 LIVE NOW
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold">
                                      🕒 UPCOMING LIVE
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {lv.date_and_time || lv.start_date || 'Scheduled Class'}
                                  </span>
                                </div>
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                  {lv.title || lv.Title || `Live Class #${i + 1}`}
                                </h4>
                                {lv.faculty_name && (
                                  <p className="text-xs text-pink-700 font-semibold mt-0.5">
                                    Educator: {lv.faculty_name}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* In-App Live Video Play Button */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {lv.pdf_link && (
                                <button
                                  onClick={() => onOpenPdf(lectureObj.Title, lv.pdf_link!)}
                                  className="px-3 py-2 rounded-xl border border-pink-300 hover:bg-pink-50 text-pink-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                  title="View Live Class PDF Handout"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>Handout</span>
                                </button>
                              )}

                              <button
                                onClick={() => onSelectLecture(lectureObj, [lectureObj, ...previousLiveVideos])}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-pink-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <PlayCircle className="w-4 h-4" />
                                <span>Watch Live in App</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Previous Live Class Broadcasts Section */}
                {previousLiveVideos.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-pink-600" />
                      <span>Previous Live Class Broadcasts ({previousLiveVideos.length})</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {previousLiveVideos.map((prevLec, i) => (
                        <div
                          key={prevLec.id || i}
                          className="flex flex-col justify-between p-4 rounded-xl border border-pink-100 bg-slate-50/60 hover:bg-pink-50/40 hover:border-pink-300 transition-all group"
                        >
                          <div className="flex items-start gap-3 min-w-0 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                              <PlayCircle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-pink-700 bg-pink-100/60 px-2 py-0.5 rounded-md inline-block mb-1">
                                {prevLec.date_and_time || 'Live Archive'}
                              </span>
                              <h5 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-pink-600 transition-colors" title={prevLec.Title}>
                                {prevLec.Title}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-1">
                                {prevLec.exam || batch.course_name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-pink-100/70">
                            {prevLec.pdf_link ? (
                              <button
                                onClick={() => onOpenPdf(prevLec.Title, prevLec.pdf_link!)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600 hover:underline"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PDF Handout</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Class Recording</span>
                            )}

                            <button
                              onClick={() => onSelectLecture(prevLec, previousLiveVideos)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-xs"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Play Recording</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
