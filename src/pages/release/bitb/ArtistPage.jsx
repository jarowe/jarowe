import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { artist, album, tracks, ctas } from '../../../content/takeovers/bitb/config';
import './ArtistPage.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

const sectionReveal = {
  hidden: { opacity: 0, y: 48 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.88, ease: EASE_OUT },
  },
};

const staggerReveal = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.11, delayChildren: 0.06 },
  },
};

const childReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.76, ease: EASE_OUT },
  },
};

function getRevealProps(reduceMotion, amount = 0.22) {
  if (reduceMotion) return {};
  return {
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, amount },
    variants: sectionReveal,
  };
}

function getContainerProps(reduceMotion, amount = 0.22) {
  if (reduceMotion) return {};
  return {
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, amount },
    variants: staggerReveal,
  };
}

export default function ArtistPage({ phase = 'pre-single' }) {
  const reduceMotion = useReducedMotion();
  const ctaSet = ctas[phase] ?? ctas['pre-single'];
  const tracksWithLyrics = tracks.filter((track) => track.lyricExcerpt);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const portraitY = useTransform(scrollYProgress ?? 0, [0, 1], [0, 70]);
  const auraOpacity = useTransform(scrollYProgress ?? 0, [0, 0.7, 1], [1, 0.72, 0.3]);
  const contentY = useTransform(scrollYProgress ?? 0, [0, 1], [0, 56]);

  return (
    <div className="bitb-artist">
      <motion.section
        id="bitb-artist-hero"
        ref={heroRef}
        className="bitb-artist-hero"
        initial={reduceMotion ? false : 'hidden'}
        animate={reduceMotion ? undefined : 'visible'}
        variants={staggerReveal}
      >
        <motion.div
          className="bitb-artist-hero__aura"
          aria-hidden="true"
          variants={childReveal}
          style={reduceMotion ? undefined : { opacity: auraOpacity }}
        />
        <motion.div
          className="bitb-artist-hero__portrait-wrap"
          variants={childReveal}
          style={reduceMotion ? undefined : { y: portraitY }}
        >
          {artist.portrait && (
            <img
              className="bitb-artist-hero__portrait"
              src={artist.portrait}
              alt={artist.name}
              draggable={false}
            />
          )}
          <div className="bitb-artist-hero__portrait-placeholder" aria-hidden="true" />
          <div className="bitb-artist-hero__ring" aria-hidden="true" />
        </motion.div>
        <motion.div
          className="bitb-artist-hero__content"
          variants={childReveal}
          style={reduceMotion ? undefined : { y: contentY }}
        >
          <span className="bitb-eyebrow">Artist</span>
          <h1 className="bitb-artist-hero__name">{artist.name}</h1>
          <p className="bitb-artist-hero__tagline">{artist.shortBio}</p>
          <div className="bitb-artist-hero__meta">
            <span>{artist.realName}</span>
            <span>Songwriter / Producer</span>
            <span>{album.title}</span>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-artist-statement"
        className="bitb-artist-statement"
        {...getRevealProps(reduceMotion)}
      >
        <div className="bitb-artist-statement__panel bitb-surface">
          <span className="bitb-eyebrow">In His Own Words</span>
          <blockquote className="bitb-artist-statement__quote">
            {artist.statement}
          </blockquote>
        </div>
      </motion.section>

      <motion.section
        id="bitb-artist-album"
        className="bitb-artist-album"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-artist-album__content bitb-surface" variants={childReveal}>
          <span className="bitb-eyebrow">The Record</span>
          <h2 className="bitb-artist-album__heading">{album.title}</h2>
          <p className="bitb-artist-album__text">{album.statement}</p>
          <div className="bitb-artist-album__meta">
            <span className="bitb-artist-album__meta-item">{album.releaseYear}</span>
            <span className="bitb-artist-album__meta-item">{album.label}</span>
            <span className="bitb-artist-album__meta-item">{tracks.length} tracks</span>
          </div>
        </motion.div>
        <motion.div className="bitb-artist-album__art-panel bitb-surface" variants={childReveal}>
          <img
            className="bitb-artist-album__artwork"
            src={album.artwork}
            alt={album.title}
            draggable={false}
          />
          <p className="bitb-artist-album__caption">
            A six-song world of exposure, grief, devotion, and becoming.
          </p>
        </motion.div>
      </motion.section>

      {tracksWithLyrics.length > 0 && (
        <motion.section
          id="bitb-artist-lyrics"
          className="bitb-artist-lyrics"
          {...getContainerProps(reduceMotion, 0.14)}
        >
          <motion.div className="bitb-artist-lyrics__header" variants={childReveal}>
            <span className="bitb-eyebrow">Selected Lyrics</span>
            <h2 className="bitb-artist-lyrics__heading">Fragments from the album's emotional spine.</h2>
          </motion.div>
          <motion.div className="bitb-artist-lyrics__grid" variants={childReveal}>
            {tracksWithLyrics.map((track, index) => (
              <motion.div
                key={track.id}
                className="bitb-artist-lyrics__card bitb-surface"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.72, delay: index * 0.05, ease: EASE_OUT }}
              >
                <span className="bitb-artist-lyrics__index">{String(track.number).padStart(2, '0')}</span>
                <blockquote className="bitb-artist-lyrics__excerpt">
                  {track.lyricExcerpt}
                </blockquote>
                <cite className="bitb-artist-lyrics__source">- {track.title}</cite>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      <motion.section
        id="bitb-artist-discography"
        className="bitb-artist-discography"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-artist-discography__copy" variants={childReveal}>
          <span className="bitb-eyebrow">Discography</span>
          <h2 className="bitb-artist-discography__heading">A debut that arrives fully formed.</h2>
          <p className="bitb-body-copy">
            Boy In The Bubble is the opening statement: intimate enough to feel handwritten, cinematic enough to hold the weight
            of a life being re-seen in public.
          </p>
        </motion.div>
        <motion.div className="bitb-artist-discography__cards" variants={childReveal}>
          <div className="bitb-artist-discography__card bitb-artist-discography__card--active bitb-surface">
            <img
              src={album.artwork}
              alt={album.title}
              className="bitb-artist-discography__art"
              draggable={false}
            />
            <div className="bitb-artist-discography__body">
              <span className="bitb-artist-discography__type">Album</span>
              <h3 className="bitb-artist-discography__title">{album.title}</h3>
              <span className="bitb-artist-discography__year">{album.releaseYear}</span>
            </div>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-artist-process"
        className="bitb-artist-process"
        {...getRevealProps(reduceMotion)}
      >
        <div className="bitb-artist-process__panel bitb-surface">
          <h2 className="bitb-artist-process__heading">A Note on Process</h2>
          <p className="bitb-artist-process__text">{album.credits.aiNote}</p>
        </div>
      </motion.section>

      <motion.section
        id="bitb-artist-cta"
        className="bitb-artist-cta"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-artist-cta__panel bitb-surface" variants={childReveal}>
          <span className="bitb-eyebrow">Enter the Record</span>
          <h2 className="bitb-artist-cta__heading">Stay in the world a little longer.</h2>
          <div className="bitb-artist-cta__buttons">
            <a
              href={ctaSet.primary.url}
              className="bitb-cta bitb-cta--primary"
              target="_blank"
              rel="noopener noreferrer"
              data-utm-campaign={ctaSet.primary.utmCampaign}
            >
              {ctaSet.primary.label}
            </a>
            <Link to="/music/boy-in-the-bubble" className="bitb-cta bitb-cta--secondary">
              Back to Release
            </Link>
          </div>
          <div className="bitb-artist-cta__socials">
            {Object.entries(artist.socials).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                className="bitb-artist-cta__social"
                target="_blank"
                rel="noopener noreferrer"
                data-platform={platform}
              >
                {platform}
              </a>
            ))}
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
