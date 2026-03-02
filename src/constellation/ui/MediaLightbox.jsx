import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveMediaUrl, getMediaType } from '../media/resolveMediaUrl';
import { useConstellationStore } from '../store';
import './MediaLightbox.css';

/**
 * Full-screen media lightbox overlay.
 * Opens when user clicks a media thumbnail in the detail panel.
 * Supports arrow key navigation and wraps around at ends.
 * ESC closes lightbox (returns to detail panel, NOT constellation).
 */
export default function MediaLightbox() {
  const lightboxMedia = useConstellationStore((s) => s.lightboxMedia);
  const lightboxIndex = useConstellationStore((s) => s.lightboxIndex);
  const closeLightbox = useConstellationStore((s) => s.closeLightbox);
  const openLightbox = useConstellationStore((s) => s.openLightbox);

  const isOpen = lightboxMedia !== null && lightboxMedia.length > 0;
  const total = lightboxMedia ? lightboxMedia.length : 0;

  const goNext = useCallback(() => {
    if (!lightboxMedia) return;
    const nextIdx = (lightboxIndex + 1) % total;
    openLightbox(lightboxMedia, nextIdx);
  }, [lightboxMedia, lightboxIndex, total, openLightbox]);

  const goPrev = useCallback(() => {
    if (!lightboxMedia) return;
    const prevIdx = (lightboxIndex - 1 + total) % total;
    openLightbox(lightboxMedia, prevIdx);
  }, [lightboxMedia, lightboxIndex, total, openLightbox]);

  // Keyboard navigation (handled at lightbox level, not page level)
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'ArrowRight') {
        e.stopPropagation();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.stopPropagation();
        goPrev();
      }
      // ESC is handled by ConstellationPage layered handler
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, goNext, goPrev]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="media-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            className="media-lightbox__close"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            aria-label="Close lightbox"
          >
            <X size={24} />
          </button>

          {/* Counter */}
          <div className="media-lightbox__counter">
            {lightboxIndex + 1} / {total}
          </div>

          {/* Media (image or video) */}
          <div
            className="media-lightbox__content"
            onClick={(e) => e.stopPropagation()}
          >
            {getMediaType(lightboxMedia[lightboxIndex]) === 'video' ? (
              <motion.video
                key={lightboxIndex}
                src={resolveMediaUrl(lightboxMedia[lightboxIndex])}
                className="media-lightbox__image"
                controls
                autoPlay
                muted
                playsInline
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              />
            ) : (
              <motion.img
                key={lightboxIndex}
                src={resolveMediaUrl(lightboxMedia[lightboxIndex])}
                alt={`Media ${lightboxIndex + 1} of ${total}`}
                className="media-lightbox__image"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </div>

          {/* Navigation arrows */}
          {total > 1 && (
            <>
              <button
                className="media-lightbox__arrow media-lightbox__arrow--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Previous image"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="media-lightbox__arrow media-lightbox__arrow--next"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Next image"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
