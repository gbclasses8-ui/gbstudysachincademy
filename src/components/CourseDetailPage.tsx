import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Folder, Play, FileText, CheckCircle2, 
  Calendar, Clock, Search, X, ChevronRight, Share2, 
  Sparkles, ExternalLink, Download, AlertCircle, Bookmark, 
  Radio, Video 
} from 'lucide-react';
import { Batch, CourseOverview, FolderItem, VideoMediaData, LiveClassItem } from '../types';
import { fetchCourseOverview, fetchFolderContent, resolveMediaContent, fetchLiveClasses } from '../services/apiService';
import { GB_LOGO_URL, TELEGRAM_URL } from '../data/batchesData';
import { VideoOptionsModal } from './VideoOptionsModal';
import { TestEngineModal } from './TestEngineModal';

interface CourseDetailPageProps {
  batch: Batch;
  onBack: () => void;
  isSaved: boolean;
  onToggleSave: (id: string | number) => void;
  onPlayVideo: (media: VideoMediaData) => void;
  onOpenPdf: (url: string, title: string) => void;
  onOpenDownload: (media: VideoMediaData) => void;
  onOpenTelegram: () => void;
}

interface BreadcrumbItem {
  id: string;
  title: string;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  batch,
  onBack,
  isSaved,
  onToggleSave,
  onPlayVideo,
  onOpenPdf,
  onOpenDownload,
  onOpenTelegram,
}) => {
  const [overview, setOverview] = useState<CourseOverview | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'overview' | 'live'>('content');
  const [folderHistory, setFolderHistory] = useState<BreadcrumbItem[]>([
    { id: '0', title: 'Course Content' },
  ]);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Video Options Modal State (matching content.html)
  const [selectedVideoItem, setSelectedVideoItem] = useState<FolderItem | null>(null);
  const [isVideoOptionsOpen, setIsVideoOptionsOpen] = useState(false);

  // Test Engine Modal State
  const [selectedTestItem, setSelectedTestItem] = useState<FolderItem | null>(null);

  // Live Classes State
  const [liveSubTab, setLiveSubTab] = useState<'LIVE' | 'UPCOMING' | 'COMPLETED'>('COMPLETED');
  const [liveClasses, setLiveClasses] = useState<LiveClassItem[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<LiveClassItem[]>([]);
  const [completedClasses, setCompletedClasses] = useState<LiveClassItem[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  // Fetch live classes when tab is active
  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'live') {
      setIsLiveLoading(true);
      const typeCode = liveSubTab === 'LIVE' ? '1' : liveSubTab === 'UPCOMING' ? '0' : '2';
      fetchLiveClasses(batch.id, typeCode as any).then((data) => {
        if (!isMounted) return;
        if (liveSubTab === 'LIVE') setLiveClasses(data);
        else if (liveSubTab === 'UPCOMING') setUpcomingClasses(data);
        else setCompletedClasses(data);
        setIsLiveLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab, liveSubTab, batch.id]);

  const currentLiveList =
    liveSubTab === 'LIVE'
      ? liveClasses
      : liveSubTab === 'UPCOMING'
      ? upcomingClasses
      : completedClasses;

  useEffect(() => {
    let isMounted = true;

    // Load batch overview
    fetchCourseOverview(batch.id).then((ov) => {
      if (isMounted && ov) setOverview(ov);
    });

    // Load root folder
    loadFolder('0', 'Course Content', true);

    return () => {
      isMounted = false;
    };
  }, [batch.id]);

  const loadFolder = async (folderId: string, title: string, isRoot = false) => {
    setIsLoading(true);
    setSearchFilter('');

    if (isRoot) {
      setFolderHistory([{ id: '0', title: 'Course Content' }]);
    } else {
      const existingIdx = folderHistory.findIndex((f) => f.id === folderId);
      if (existingIdx > -1) {
        setFolderHistory(folderHistory.slice(0, existingIdx + 1));
      } else {
        setFolderHistory([...folderHistory, { id: folderId, title }]);
      }
    }

    try {
      const data = await fetchFolderContent(batch.id, folderId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load folder:', err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = async (item: FolderItem) => {
    if (item.type === 'folder') {
      loadFolder(item.entity_id, item.title);
      return;
    }

    if (item.type === 'file') {
      const isVideo = item.data?.file_type === 2 || (item.data?.video_type ?? 0) > 0;
      if (isVideo) {
        // Open Video Options Modal per content.html
        setSelectedVideoItem(item);
        setIsVideoOptionsOpen(true);
      } else {
        // PDF Note - Directly opens in new tab immediately without intermediate modal
        const existingUrl = item.data?.file_url;
        if (existingUrl && existingUrl.startsWith('http')) {
          window.open(existingUrl, '_blank', 'noopener,noreferrer');
        } else {
          // Open target window immediately to avoid browser popup blockers
          const newWindow = window.open('about:blank', '_blank');
          resolveMediaContent(batch.id, item.entity_id)
            .then((resolved) => {
              const finalPdfUrl = resolved?.file_url || item.data?.file_url;
              if (finalPdfUrl && newWindow) {
                newWindow.location.href = finalPdfUrl;
              } else if (finalPdfUrl) {
                window.open(finalPdfUrl, '_blank', 'noopener,noreferrer');
              } else if (newWindow) {
                newWindow.close();
                alert('PDF link is currently updating.');
              }
            })
            .catch(() => {
              if (newWindow) newWindow.close();
            });
        }
      }
      return;
    }

    if (item.type === 'test') {
      setSelectedTestItem(item);
    }
  };

  const handleWatchVideo = async () => {
    if (!selectedVideoItem) return;
    setIsVideoOptionsOpen(false);
    const resolved = await resolveMediaContent(batch.id, selectedVideoItem.entity_id);
    if (resolved) {
      onPlayVideo(resolved);
    } else {
      onPlayVideo({
        id: selectedVideoItem.entity_id,
        course_id: batch.id,
        title: selectedVideoItem.title,
        file_url: selectedVideoItem.data?.file_url || '',
      });
    }
  };

  const handleDownloadVideo = async () => {
    if (!selectedVideoItem) return;
    setIsVideoOptionsOpen(false);
    const resolved = await resolveMediaContent(batch.id, selectedVideoItem.entity_id);
    if (resolved) {
      onOpenDownload(resolved);
    } else {
      onOpenDownload({
        id: selectedVideoItem.entity_id,
        course_id: batch.id,
        title: selectedVideoItem.title,
        file_url: selectedVideoItem.data?.file_url || '',
      });
    }
  };

  const formatDuration = (seconds?: number | string) => {
    const s = Number(seconds);
    if (!s || isNaN(s)) return '00:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const mStr = m.toString().padStart(2, '0');
    const sStr = sec.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
  };

  const formatDate = (timestamp?: number | string) => {
    const t = Number(timestamp);
    if (!t || isNaN(t)) return '';
    return new Date(t * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredItems = items.filter((item) => {
    if (!searchFilter.trim()) return true;
    return item.title?.toLowerCase().includes(searchFilter.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 text-[#e5e5e5] flex flex-col">
      {/* Exact Header from content.html */}
      <header className="nav-glass px-4 py-3 sticky top-0 z-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => {
              if (folderHistory.length > 1) {
                const prev = folderHistory[folderHistory.length - 2];
                loadFolder(prev.id, prev.title);
              } else {
                onBack();
              }
            }}
            className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-sm font-semibold btn-click-effect cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left" />
            <span className="hidden md:inline">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-black border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={GB_LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-bold tracking-wider text-white font-syne">
              GB <span className="text-pink-500">STUDY</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 rounded-md border border-pink-500/20 text-[10px] md:text-xs font-semibold text-pink-400 uppercase tracking-wide">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
          Enrolled
        </div>
      </header>

      {/* Main Container matching content.html */}
      <main className="max-w-[1400px] w-full mx-auto p-4 md:p-6 flex-1 relative z-10 flex flex-col">
        {/* Course Banner matching content.html */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col-reverse md:flex-row items-center justify-between gap-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="flex flex-col items-start gap-3 flex-1 w-full relative z-10">
            <span className="text-xs font-medium text-pink-400 uppercase tracking-wider bg-pink-500/10 px-2.5 py-1 rounded border border-pink-500/20">
              Premium Course
            </span>
            <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight font-syne">
              {batch.title}
            </h2>
          </div>

          <div className="w-full md:w-auto shrink-0 flex justify-center md:justify-end relative z-10">
            <img
              src={batch.thumbnail}
              alt={batch.title}
              className="w-full max-w-[300px] rounded-xl border border-white/10 object-cover aspect-[16/9]"
            />
          </div>
        </div>

        {/* Tab Bar matching content.html */}
        <div className="flex gap-6 md:gap-8 border-b border-white/10 mb-6 overflow-x-auto scrollbar-hide w-full shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm md:text-base font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap btn-click-effect shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'text-pink-400 border-pink-500'
                : 'text-stone-400 hover:text-white border-transparent'
            }`}
          >
            <i className="fa-solid fa-circle-info" /> Overview
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`pb-3 text-sm md:text-base font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap btn-click-effect shrink-0 cursor-pointer ${
              activeTab === 'content'
                ? 'text-pink-400 border-pink-500'
                : 'text-stone-400 hover:text-white border-transparent'
            }`}
          >
            <i className="fa-regular fa-folder-open" /> Content
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`pb-3 text-sm md:text-base font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap btn-click-effect shrink-0 cursor-pointer ${
              activeTab === 'live'
                ? 'text-pink-400 border-pink-500'
                : 'text-stone-400 hover:text-white border-transparent'
            }`}
          >
            <i className="fa-solid fa-video" /> Live Classes
          </button>
        </div>

        {/* =================== TAB 1: OVERVIEW =================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-pop-in">
            {/* Extra Overview / Time Table matching content.html */}
            {overview?.timeTableHtml && (
              <div className="bg-[#18181b] border border-pink-500/20 rounded-xl p-5 md:p-6 shadow-[0_0_20px_rgba(236,72,153,0.05)]">
                <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
                  <i className="fa-regular fa-calendar-alt" /> {overview.timeTableTitle || 'Time Table'}
                </h3>
                <div
                  id="extra-overview-content"
                  className="text-gray-300 leading-relaxed text-sm md:text-base prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: overview.timeTableHtml }}
                />
              </div>
            )}

            {/* Main Course Description matching content.html */}
            <div className="bg-[#121212] border border-white/5 rounded-xl p-6 md:p-8 text-gray-300 leading-relaxed text-sm md:text-base prose prose-invert max-w-none course-desc">
              {overview?.description ? (
                <div dangerouslySetInnerHTML={{ __html: overview.description }} />
              ) : (
                <p>Welcome to {batch.title}. All lectures, PDF notes and test assessments are available under the Content tab.</p>
              )}
            </div>
          </div>
        )}

        {/* =================== TAB 2: CONTENT =================== */}
        {activeTab === 'content' && (
          <div className="animate-pop-in flex flex-col flex-1">
            {/* Breadcrumbs matching content.html */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center text-xs md:text-sm font-medium flex-wrap text-stone-400">
                {folderHistory.map((folder, index) => {
                  const isFirst = index === 0;
                  const isLast = index === folderHistory.length - 1;
                  return (
                    <span key={folder.id} className="flex items-center">
                      <span
                        onClick={() => !isLast && loadFolder(folder.id, folder.title)}
                        className={`transition-colors btn-click-effect ${
                          isLast ? 'text-white font-semibold' : 'text-stone-400 hover:text-white cursor-pointer'
                        }`}
                      >
                        {isFirst && <i className="fa-solid fa-home mr-1.5" />}
                        {folder.title}
                      </span>
                      {!isLast && <i className="fa-solid fa-chevron-right text-[10px] mx-2 text-stone-600" />}
                    </span>
                  );
                })}
              </div>

              {/* Local Folder Search */}
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter this folder..."
                  className="w-full bg-[#121212] border border-white/10 text-white text-xs rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:border-pink-500"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-pink-500 mb-3" />
                <p className="text-stone-400 text-sm font-medium">Loading content...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                  <i className="fa-regular fa-folder-open text-2xl text-stone-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Folder is Empty</h3>
                <p className="text-sm text-stone-400">No content available here yet.</p>
              </div>
            ) : (
              /* Content Grid matching content.html */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item, index) => {
                  const isFolder = item.type === 'folder';
                  const isTest = item.type === 'test';
                  const isVideo =
                    item.type === 'file' &&
                    (item.data?.file_type === 2 || (item.data?.video_type ?? 0) > 0);
                  const isPdf = item.type === 'file' && !isVideo;

                  // 1. Folder Card matching content.html
                  if (isFolder) {
                    const counts = item.data?.content_counts || {};
                    const fCount = counts.folders?.total || 0;
                    const vCount = (counts.video?.paid || 0) + (counts.video?.free || 0);
                    const pCount = (counts.pdf?.paid || 0) + (counts.pdf?.free || 0);
                    const tCount = (counts.test?.paid || 0) + (counts.test?.free || 0);

                    const badges: string[] = [];
                    if (fCount > 0) badges.push(`FOLDERS ${fCount}`);
                    if (vCount > 0) badges.push(`VIDEO ${vCount}`);
                    if (pCount > 0) badges.push(`PDF ${pCount}`);
                    if (tCount > 0) badges.push(`TEST ${tCount}`);
                    const countsText = badges.length > 0 ? badges.join('   ') : 'EMPTY';

                    return (
                      <div
                        key={item.entity_id || index}
                        onClick={() => handleItemClick(item)}
                        className="glass-card rounded-[20px] cursor-pointer group flex flex-col overflow-hidden h-[220px] animate-pop-in btn-click-effect"
                      >
                        <div className="h-[125px] w-full relative overflow-hidden bg-[#18181b] border-b border-white/5">
                          {item.data?.thumbnail ? (
                            <img
                              src={item.data.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#18181b]">
                              <i className="fa-solid fa-folder text-4xl text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.4)]" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-center bg-[#121212] group-hover:bg-[#1a1a1a] transition-colors">
                          <h3 className="text-white font-medium text-sm leading-snug line-clamp-2">
                            {item.title}
                          </h3>
                          <div className="mt-2 text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                            {countsText}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. Video Card matching content.html
                  if (isVideo) {
                    const durationRaw = Number(item.data?.duration) || 0;
                    const duration = formatDuration(durationRaw);
                    const formattedDate = formatDate(item.data?.created_at);
                    const isLive = item.data?.is_live == 1;
                    const videoType = item.data?.video_type;
                    const vdcId = item.data?.vdc_id;
                    const isUpcoming = !isLive && durationRaw === 0 && videoType != 4;
                    const isYouTube = !vdcId && videoType == 1;

                    return (
                      <div
                        key={item.entity_id || index}
                        onClick={() => handleItemClick(item)}
                        className="glass-card rounded-[20px] overflow-hidden cursor-pointer group flex flex-col h-[220px] animate-pop-in btn-click-effect"
                      >
                        <div className="relative h-[125px] w-full bg-black overflow-hidden border-b border-white/5">
                          <img
                            src={
                              item.data?.thumbnail?.trim()
                                ? item.data.thumbnail
                                : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'
                            }
                            alt={item.title}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105"
                          />

                          {/* Tag */}
                          <div className="absolute top-2 left-2">
                            {isYouTube ? (
                              <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                                <i className="fa-brands fa-youtube" /> YOUTUBE
                              </span>
                            ) : isLive ? (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow-lg">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                              </span>
                            ) : isUpcoming ? (
                              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                                <i className="fa-regular fa-clock" /> UPCOMING
                              </span>
                            ) : (
                              <span className="bg-black/60 backdrop-blur-sm text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" /> VIDEO
                              </span>
                            )}
                          </div>

                          {/* Center Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
                            <div className="w-12 h-12 bg-pink-500/90 backdrop-blur-sm rounded-full flex items-center justify-center pl-1 shadow-[0_0_15px_rgba(236,72,153,0.5)] transform scale-75 group-hover:scale-100 transition-transform duration-300 border border-pink-400">
                              <i className="fa-solid fa-play text-white text-lg" />
                            </div>
                          </div>

                          {!isUpcoming && !isLive && !isYouTube && duration !== '00:00' && (
                            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm border border-white/10 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                              {duration}
                            </div>
                          )}
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-center bg-[#121212] group-hover:bg-[#1a1a1a] transition-colors">
                          <h3 className="text-gray-200 font-medium text-sm leading-snug line-clamp-2">
                            {item.title}
                          </h3>
                          {formattedDate && (
                            <div className="text-[10px] text-stone-500 mt-2 font-medium tracking-wide">
                              {formattedDate}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 3. PDF Card matching content.html
                  if (isPdf) {
                    const formattedDate = formatDate(item.data?.created_at);
                    return (
                      <div
                        key={item.entity_id || index}
                        onClick={() => handleItemClick(item)}
                        className="glass-card rounded-[20px] overflow-hidden cursor-pointer group flex flex-col h-[220px] animate-pop-in btn-click-effect"
                      >
                        <div className="relative h-[125px] w-full bg-[#18181b] flex items-center justify-center border-b border-white/5">
                          <i className="fa-regular fa-file-pdf text-4xl text-pink-400 group-hover:scale-110 transition-transform" />
                          <div className="absolute top-2 left-2">
                            <span className="bg-pink-500/10 text-pink-400 text-[10px] font-medium px-2 py-0.5 rounded border border-pink-500/20">
                              PDF
                            </span>
                          </div>
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-center bg-[#121212] group-hover:bg-[#1a1a1a] transition-colors">
                          <h3 className="text-gray-200 font-medium text-sm leading-snug line-clamp-2">
                            {item.title}
                          </h3>
                          {formattedDate && (
                            <div className="text-[10px] text-stone-500 mt-2 font-medium tracking-wide">
                              {formattedDate}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 4. Test Card matching content.html
                  return (
                    <div
                      key={item.entity_id || index}
                      className="col-span-full glass-card rounded-[20px] overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-all duration-200 animate-pop-in border border-white/5 hover:border-pink-500/30"
                    >
                      <div className="flex items-start sm:items-center gap-4 mb-4 sm:mb-0">
                        <div className="w-14 h-14 shrink-0 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20 group-hover:scale-105 transition-transform">
                          <i className="fa-solid fa-list-check text-2xl text-pink-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-pink-500/10 text-pink-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-pink-500/20 uppercase tracking-widest">
                              MOCK TEST
                            </span>
                          </div>
                          <h3 className="text-white font-medium text-base">{item.title}</h3>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedTestItem(item)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm bg-white/10 hover:bg-pink-500 hover:text-white text-white transition-colors btn-click-effect cursor-pointer"
                      >
                        Start Assessment
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================== TAB 3: LIVE CLASSES =================== */}
        {activeTab === 'live' && (
          <div className="animate-pop-in space-y-6">
            {/* Sub-tabs matching live.html */}
            <div className="flex items-center gap-2 overflow-x-auto p-1 bg-[#121212] rounded-xl border border-white/5 w-fit">
              <button
                onClick={() => setLiveSubTab('LIVE')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  liveSubTab === 'LIVE'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Live Now</span>
                {liveClasses.length > 0 && (
                  <span className="bg-black/40 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
                    {liveClasses.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setLiveSubTab('UPCOMING')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  liveSubTab === 'UPCOMING'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Upcoming</span>
                {upcomingClasses.length > 0 && (
                  <span className="bg-black/40 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
                    {upcomingClasses.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setLiveSubTab('COMPLETED')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  liveSubTab === 'COMPLETED'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Recorded Sessions</span>
                {completedClasses.length > 0 && (
                  <span className="bg-black/40 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
                    {completedClasses.length}
                  </span>
                )}
              </button>
            </div>

            {/* Live Classes Content Container */}
            {isLiveLoading ? (
              <div className="flex flex-col justify-center items-center py-20">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-pink-500 mb-3" />
                <p className="text-stone-400 text-sm font-medium">Loading live classes...</p>
              </div>
            ) : currentLiveList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-[#121212] rounded-2xl border border-white/5 p-8">
                <Radio className="w-12 h-12 text-pink-500/40 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">
                  No {liveSubTab.toLowerCase()} classes available right now
                </h3>
                <p className="text-xs text-stone-400 max-w-sm mb-4">
                  {liveSubTab === 'LIVE'
                    ? 'There is no live session broadcasting at this moment. You can browse recorded sessions or check upcoming schedules.'
                    : 'Check back later for updated live class broadcasts.'}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLiveSubTab('COMPLETED')}
                    className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-colors btn-click-effect cursor-pointer"
                  >
                    Watch Recorded Sessions
                  </button>
                  <button
                    onClick={onOpenTelegram}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 text-xs font-semibold border border-white/10"
                  >
                    Get Live Alerts on Telegram
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {currentLiveList.map((item, idx) => {
                  const targetTime = item.live_from || item.start_time || item.created_at;
                  const dateStr = formatDate(targetTime);
                  const isLiveItem = liveSubTab === 'LIVE' || String(item.live_status) === '1';
                  const videoId = item.video_id || item.id;

                  return (
                    <div
                      key={item.id || idx}
                      className="glass-card rounded-[20px] overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/40"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-video bg-black overflow-hidden border-b border-white/5">
                        <img
                          src={item.thumbnail || batch.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent pointer-events-none" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5">
                          {isLiveItem ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-600 text-white shadow-lg text-[10px] font-black uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                              <span>LIVE NOW</span>
                            </div>
                          ) : liveSubTab === 'COMPLETED' ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>RECORDED</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-pink-950/80 border border-pink-500/40 text-pink-300 text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-pink-400" />
                              <span>SCHEDULED</span>
                            </div>
                          )}
                        </div>

                        {item.duration && Number(item.duration) > 0 && (
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white border border-white/10">
                            {formatDuration(item.duration)}
                          </div>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between bg-[#121212]">
                        <div>
                          <div className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-1 truncate">
                            {batch.title}
                          </div>
                          <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                          {dateStr && (
                            <div className="mt-2 text-[10px] text-stone-400 font-medium flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-pink-400" />
                              <span>{dateStr}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const resolved = await resolveMediaContent(batch.id, videoId);
                              if (resolved) {
                                onPlayVideo(resolved);
                              } else {
                                onPlayVideo({
                                  id: videoId,
                                  course_id: batch.id,
                                  title: item.title,
                                  file_url: item.file_url || '',
                                  thumbnail: item.thumbnail,
                                  is_live: isLiveItem ? 1 : 0,
                                });
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-lg font-bold text-xs text-white bg-pink-500 hover:bg-pink-600 transition-colors btn-click-effect shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{isLiveItem ? 'Watch Live Stream' : 'Watch Recording'}</span>
                          </button>

                          <button
                            onClick={async () => {
                              const resolved = await resolveMediaContent(batch.id, videoId);
                              if (resolved) {
                                onOpenDownload(resolved);
                              }
                            }}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                            title="Download options"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Video Options Modal matching content.html */}
      <VideoOptionsModal
        isOpen={isVideoOptionsOpen}
        title={selectedVideoItem?.title}
        onWatch={handleWatchVideo}
        onDownload={handleDownloadVideo}
        onClose={() => setIsVideoOptionsOpen(false)}
      />

      {/* Test Assessment Engine Modal */}
      {selectedTestItem && (
        <TestEngineModal
          testId={selectedTestItem.entity_id}
          testTitle={selectedTestItem.title}
          onClose={() => setSelectedTestItem(null)}
        />
      )}
    </div>
  );
};
