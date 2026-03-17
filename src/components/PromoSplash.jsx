import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './PromoSplash.css';

const EASE_OUT = [0.22, 1, 0.36, 1];
const BASE = import.meta.env.BASE_URL;
const ARTWORK = `${BASE}images/music/Boy In The Bubble/jarowe_boyinthebubble_album-art.jpg`;
const SPOTIFY_URL = 'https://open.spotify.com/album/1evTMGldNCiaD5jQuAiAdC';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

export default function PromoSplash({ onDismiss }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <motion.div
      className="promo-splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="promo-splash__backdrop" onClick={onDismiss} />

      <motion.div
        className="promo-splash__card"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <div className="promo-splash__glow promo-splash__glow--gold" aria-hidden="true" />
        <div className="promo-splash__glow promo-splash__glow--rose" aria-hidden="true" />

        <motion.img
          src={ARTWORK}
          alt="Boy In The Bubble album artwork"
          className="promo-splash__artwork"
          draggable={false}
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.12 }}
        />

        <motion.div className="promo-splash__text" variants={stagger}>
          <motion.p className="promo-splash__eyebrow" variants={fadeUp}>New Album</motion.p>
          <motion.h2 className="promo-splash__title" variants={fadeUp}>
            Boy In The Bubble
          </motion.h2>
          <motion.p className="promo-splash__subtitle" variants={fadeUp}>
            The weight of becoming, the grace of letting go.
          </motion.p>
        </motion.div>

        <motion.div className="promo-splash__ctas" variants={fadeUp}>
          <a
            href={SPOTIFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="promo-splash__cta promo-splash__cta--spotify"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Listen on Spotify
          </a>
          <Link
            to="/music/boy-in-the-bubble"
            onClick={onDismiss}
            className="promo-splash__cta promo-splash__cta--explore"
          >
            Explore the Release
          </Link>
        </motion.div>

        <motion.button
          className="promo-splash__enter"
          onClick={onDismiss}
          variants={fadeUp}
        >
          Enter Site
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
