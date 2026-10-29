import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { BatchCard } from './components/BatchCard';
import { CourseView } from './components/CourseView';
import { LecturePlayer } from './components/LecturePlayer';
import { TelegramModal, TELEGRAM_URL } from './components/TelegramModal';
import { PdfModal } from './components/PdfModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Footer } from './components/Footer';
import { Batch, Lecture } from './types';
import { fetchBatches } from './services/api';
import { FALLBACK_BATCHES } from './data/fallbackBatches';
import { Send, Loader2, Sparkles, BookOpen } from 'lucide-react';

export default function App() {
  const [batches, setBatches] = useState<Batch[]>(FALLBACK_BATCHES);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(true);

  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'course' | 'player'>('home');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Lecture[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Modals
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const [pdfModal, setPdfModal] = useState<{ isOpen: boolean; title: string; url: string }>({
    isOpen: false,
    title: '',
    url: '',
  });

  // 1. Initial Load: Fetch live batches & Show Telegram Popup
  useEffect(() => {
    let isMounted = true;
    fetchBatches().then((data) => {
      if (isMounted) {
        setBatches(data);
        setLoadingBatches(false);
      }
    });

    // Check if user already saw telegram popup in this session
    const hasSeenTelegram = sessionStorage.getItem('gb_telegram_popup_seen');
    if (!hasSeenTelegram) {
      // Show Telegram popup on website open as requested
      const timer = setTimeout(() => {
        setIsTelegramModalOpen(true);
        sessionStorage.setItem('gb_telegram_popup_seen', 'true');
      }, 700);
      return () => clearTimeout(timer);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard shortcut: Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
        setIsTelegramModalOpen(false);
        setPdfModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract unique categories, ensuring Live Classes is available
  const categories = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return ['All', 'Live Classes', ...Array.from(set)];
  }, [batches]);

  // Filter batches for homepage
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        !searchQuery.trim() ||
        b.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'All' ||
        (selectedCategory === 'Live Classes' && (
          b.id === '364' || b.id === '75' || b.id === '152' || b.id === '248' || b.id === '281' ||
          b.course_name.toUpperCase().includes('CTET') || b.course_name.toUpperCase().includes('KVS') || b.course_name.toUpperCase().includes('BPSC')
        )) ||
        b.category === selectedCategory ||
        (selectedCategory === 'CTET' && b.course_name.toUpperCase().includes('CTET')) ||
        (selectedCategory === 'BPSC TRE' && (b.course_name.toUpperCase().includes('BPSC') || b.course_name.toUpperCase().includes('BIHAR'))) ||
        (selectedCategory === 'KVS/NVS' && (b.course_name.toUpperCase().includes('KVS') || b.course_name.toUpperCase().includes('NVS'))) ||
        (selectedCategory === 'UP SuperTET' && (b.course_name.toUpperCase().includes('SUPERTET') || b.course_name.toUpperCase().includes('UP '))) ||
        (selectedCategory === 'State TET' && b.course_name.toUpperCase().includes('TET'));

      return matchesSearch && matchesCat;
    });
  }, [batches, searchQuery, selectedCategory]);

  // Handlers for Navigation
  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setCurrentView('course');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLecture = (lecture: Lecture, playlist: Lecture[] = []) => {
    setSelectedLecture(lecture);
    if (playlist.length > 0) {
      setCurrentPlaylist(playlist);
    }
    setCurrentView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
    setSelectedBatch(null);
    setSelectedLecture(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateBack = () => {
    if (currentView === 'player' && selectedBatch) {
      setCurrentView('course');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleNavigateHome();
    }
  };

  const handleOpenPdf = (title: string, url: string) => {
    setPdfModal({
      isOpen: true,
      title,
      url,
    });
  };

  const handleClosePdf = () => {
    setPdfModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-pink-50/20 text-slate-900 selection:bg-pink-500 selection:text-white">
      
      {/* Primary Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigateHome={handleNavigateHome}
        onNavigateBack={handleNavigateBack}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenTelegram={() => setIsTelegramModalOpen(true)}
        courseTitle={selectedBatch?.course_name}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          if (currentView !== 'home') {
            setCurrentView('home');
          }
        }}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <div>
            {/* Hero Section */}
            <HeroBanner
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categories={categories}
              totalBatches={batches.length}
            />

            {/* Batches Grid Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {selectedCategory === 'All' ? 'All Teaching & Exam Batches' : `${selectedCategory} Batches`}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Select any batch to start watching chapter-wise lectures and downloading PDF notes.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-semibold text-pink-700 bg-pink-100/70 px-3 py-1 rounded-full">
                    {filteredBatches.length} {filteredBatches.length === 1 ? 'Batch' : 'Batches'}
                  </span>
                </div>
              </div>

              {/* Batches Cards Grid */}
              {filteredBatches.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-pink-100 p-8">
                  <BookOpen className="w-12 h-12 mx-auto text-pink-300 mb-3 stroke-1" />
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    No batches match your query
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    We couldn't find any batches matching "{searchQuery}". Try selecting another category or resetting the search.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-semibold hover:bg-pink-500 transition-colors"
                  >
                    View All Batches
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                  {filteredBatches.map((batch) => (
                    <BatchCard
                      key={batch.id}
                      batch={batch}
                      onSelect={handleSelectBatch}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {currentView === 'course' && selectedBatch && (
          <CourseView
            batch={selectedBatch}
            onBack={handleNavigateHome}
            onSelectLecture={handleSelectLecture}
            onOpenPdf={handleOpenPdf}
            onOpenTelegram={() => setIsTelegramModalOpen(true)}
          />
        )}

        {currentView === 'player' && selectedBatch && selectedLecture && (
          <LecturePlayer
            batch={selectedBatch}
            lecture={selectedLecture}
            playlist={currentPlaylist}
            onBack={handleNavigateBack}
            onSelectLecture={(lec) => handleSelectLecture(lec, currentPlaylist)}
            onOpenPdf={handleOpenPdf}
            onOpenTelegram={() => setIsTelegramModalOpen(true)}
          />
        )}
      </main>

      {/* Floating Telegram CTA Button (Adheres to 15% mobile sticky cap) */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          onClick={() => setIsTelegramModalOpen(true)}
          className="group flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-pink-500/30 ring-2 ring-white transition-all hover:scale-105 active:scale-95"
          aria-label="Open GB STUDY Telegram Channel"
        >
          <Send className="w-4 h-4 fill-white" />
          <span className="hidden sm:inline">Join Telegram</span>
          <span className="sm:hidden">Telegram</span>
        </button>
      </div>

      {/* Footer */}
      <Footer
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          if (currentView !== 'home') setCurrentView('home');
        }}
        onNavigateHome={handleNavigateHome}
        onOpenTelegram={() => setIsTelegramModalOpen(true)}
      />

      {/* Telegram Popup Modal */}
      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      {/* PDF Modal Viewer */}
      <PdfModal
        isOpen={pdfModal.isOpen}
        onClose={handleClosePdf}
        title={pdfModal.title}
        pdfUrl={pdfModal.url}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        batches={batches}
        onSelectBatch={handleSelectBatch}
      />

    </div>
  );
}
