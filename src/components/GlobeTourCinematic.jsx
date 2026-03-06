import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import './GlobeTourCinematic.css';

export default function GlobeTourCinematic({
  chapter,
  chapterIndex,
  totalChapters,
  narration,
  onPrev,
  onNext,
  onExit,
  exiting = false,
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showSweep, setShowSweep] = useState(false);
  const photoTimerRef = useRef(null);
  const prevChapterRef = useRef(chapterIndex);
  const touchStartRef = useRef(null);

  // Reset photo index when chapter changes
  useEffect(() => {
    setPhotoIndex(0);
  }, [chapterIndex]);

  // Auto-cycle photos every 4s
  useEffect(() => {
    if (!chapter?.photos?.length || chapter.photos.length <= 1) return;
    photoTimerRef.current = setInterval(() => {
      setPhotoIndex(prev => (prev + 1) % chapter.photos.length);
    }, 4000);
    return () => clearInterval(photoTimerRef.current);
  }, [chapter]);

  // Sweep line on chapter change
  useEffect(() => {
    if (prevChapterRef.current !== chapterIndex && chapterIndex > 0) {
      setShowSweep(true);
      const t = setTimeout(() => setShowSweep(false), 700);
      prevChapterRef.current = chapterIndex;
      return () => clearTimeout(t);
    }
    prevChapterRef.current = chapterIndex;
  }, [chapterIndex]);

  // Touch swipe for mobile
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    if (Math.abs(delta) > 50) {
      if (delta < 0 && chapterIndex < totalChapters - 1) onNext();
      else if (delta > 0 && chapterIndex > 0) onPrev();
    }
  }, [chapterIndex, totalChapters, onNext, onPrev]);

  const photos = chapter?.photos || [];
  const currentPhoto = photos[photoIndex] || null;

  return (
    <div
      className={`tour-cinematic-overlay${exiting ? ' exiting' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Letterbox bars — slide in on mount, retract on exit */}
      <div className={`tour-letterbox top${exiting ? ' retracting' : ''}`} />
      <div className={`tour-letterbox bottom${exiting ? ' retracting' : ''}`} />

      {/* All overlay content fades in on mount, fades out on exit */}
      <motion.div
        className="tour-overlay-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: exiting ? 0.5 : 0.6, delay: exiting ? 0 : 0.3 }}
      >
        {/* Sweep line on chapter transition */}
        {showSweep && <div className="tour-sweep-line" key={`sweep-${chapterIndex}`} />}

        {chapter && (
          <>
            {/* Chapter title */}
            <AnimatePresence mode="wait">
              <motion.div
                key={chapter.id}
                className="tour-chapter-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <h2>{chapter.title}</h2>
                <div className="tour-chapter-subtitle">{chapter.subtitle}</div>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="tour-progress">
              {Array.from({ length: totalChapters }).map((_, i) => (
                <span key={i}>
                  {i > 0 && <span className="tour-progress-line" />}
                  <span
                    className={`tour-progress-dot${
                      i < chapterIndex ? ' completed' : ''
                    }${i === chapterIndex ? ' active' : ''}`}
                  />
                </span>
              ))}
            </div>

            {/* Photo panel */}
            <AnimatePresence>
              {photos.length > 0 && (
                <motion.div
                  key={`panel-${chapter.id}`}
                  className="tour-photo-panel"
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
                >
                  <div className="tour-photo-card">
                    <AnimatePresence mode="wait">
                      {currentPhoto && (
                        <motion.img
                          key={currentPhoto.src}
                          src={currentPhoto.src}
                          alt={currentPhoto.caption || ''}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6 }}
                        />
                      )}
                    </AnimatePresence>
                    {currentPhoto?.caption && (
                      <div className="tour-photo-caption">{currentPhoto.caption}</div>
                    )}
                    {photos.length > 1 && (
                      <div className="tour-photo-dots">
                        {photos.map((_, i) => (
                          <span
                            key={i}
                            className={`tour-photo-dot${i === photoIndex ? ' active' : ''}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Narration text */}
            <AnimatePresence mode="wait">
              {narration && (
                <motion.div
                  key={narration.text}
                  className="tour-narration"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <div className={`tour-narration-text${narration.attribution ? ' is-quote' : ''}`}>
                    {narration.text}
                  </div>
                  {narration.attribution && (
                    <div className="tour-narration-attribution">\u2014 {narration.attribution}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Exit button */}
            <button className="tour-exit-btn" onClick={onExit} aria-label="Exit tour">
              <X size={16} />
            </button>

            {/* Nav controls */}
            <div className="tour-nav-controls">
              <button
                className="tour-nav-btn"
                onClick={onPrev}
                disabled={chapterIndex <= 0}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                className="tour-nav-btn"
                onClick={onNext}
                disabled={chapterIndex >= totalChapters - 1}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
