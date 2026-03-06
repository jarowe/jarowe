import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl, getMediaType } from '../../constellation/media/resolveMediaUrl';
import { playClickSound } from '../../utils/sounds';
import './MemoryDetailOverlay.css';

export default function MemoryDetailOverlay({ memory, onClose }) {
  const [imageIndex, setImageIndex] = useState(0);

  if (!memory) return null;

  const images = memory.allImages || [];
  const hasMultiple = images.length > 1;
  const currentSrc = images[imageIndex] ? resolveMediaUrl(images[imageIndex]) : '';
  const isVideo = images[imageIndex] ? getMediaType(images[imageIndex]) === 'video' : false;

  const prev = () => {
    playClickSound();
    setImageIndex(i => (i - 1 + images.length) % images.length);
  };
  const next = () => {
    playClickSound();
    setImageIndex(i => (i + 1) % images.length);
  };

  const dateLabel = memory.date
    ? new Date(memory.date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long',
      })
    : '';

  // Truncate description for display
  const desc = memory.description || '';
  const shortDesc = desc.length > 300 ? desc.substring(0, 300) + '...' : desc;

  return (
    <AnimatePresence>
      <motion.div
        className="memory-overlay-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="memory-overlay-card"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <button className="memory-overlay-close" onClick={() => { playClickSound(); onClose(); }}>
            <X size={20} />
          </button>

          <div className="memory-overlay-media">
            {isVideo ? (
              <video src={currentSrc} controls playsInline className="memory-overlay-img" />
            ) : (
              <img src={currentSrc} alt={memory.title} className="memory-overlay-img" loading="eager" />
            )}

            {hasMultiple && (
              <>
                <button className="memory-overlay-nav memory-overlay-prev" onClick={prev}>
                  <ChevronLeft size={24} />
                </button>
                <button className="memory-overlay-nav memory-overlay-next" onClick={next}>
                  <ChevronRight size={24} />
                </button>
                <div className="memory-overlay-dots">
                  {images.slice(0, 10).map((_, i) => (
                    <span
                      key={i}
                      className={`memory-overlay-dot${i === imageIndex ? ' active' : ''}`}
                      onClick={() => { playClickSound(); setImageIndex(i); }}
                    />
                  ))}
                  {images.length > 10 && <span className="memory-overlay-dot-more">+{images.length - 10}</span>}
                </div>
              </>
            )}
          </div>

          <div className="memory-overlay-body">
            <div className="memory-overlay-badges">
              <span className="memory-badge epoch-badge" style={{ borderColor: memory.epochColor, color: memory.epochColor }}>
                {memory.epoch}
              </span>
              {memory.theme && (
                <span className="memory-badge theme-badge">{memory.theme}</span>
              )}
              {dateLabel && (
                <span className="memory-badge date-badge">{dateLabel}</span>
              )}
            </div>

            <h2 className="memory-overlay-title">{memory.title}</h2>

            {shortDesc && (
              <p className="memory-overlay-desc">{shortDesc}</p>
            )}

            <Link
              to="/constellation"
              className="memory-overlay-link"
              onClick={() => { playClickSound(); onClose(); }}
            >
              <ExternalLink size={14} />
              Explore in Full Constellation
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
