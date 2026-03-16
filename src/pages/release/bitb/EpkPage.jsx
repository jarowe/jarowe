import { motion, useReducedMotion } from 'framer-motion';
import {
  artist,
  album,
  tracks,
  press,
  focusTrackId,
  dates,
} from '../../../content/takeovers/bitb/config';
import './EpkPage.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

const sectionReveal = {
  hidden: { opacity: 0, y: 42 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.82, ease: EASE_OUT },
  },
};

const staggerReveal = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const childReveal = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: EASE_OUT },
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

export default function EpkPage() {
  const reduceMotion = useReducedMotion();
  const focusTrack = tracks.find((track) => track.id === focusTrackId);

  const handleDownload = (_event, asset) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bitb-cta-click', {
          detail: { type: 'asset-download', label: asset.label },
        })
      );
    }
  };

  return (
    <div className="bitb-epk">
      <motion.section
        id="bitb-epk-header"
        className="bitb-epk-header"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-epk-header__art-panel bitb-surface" variants={childReveal}>
          <img
            className="bitb-epk-header__artwork"
            src={album.artwork}
            alt={album.title}
            draggable={false}
          />
        </motion.div>
        <motion.div className="bitb-epk-header__info bitb-surface" variants={childReveal}>
          <span className="bitb-eyebrow">Electronic Press Kit</span>
          <h1 className="bitb-epk-header__title">{album.title}</h1>
          <p className="bitb-epk-header__artist">by {artist.name}</p>
          <p className="bitb-epk-header__oneliner">{press.oneLiner}</p>
          <div className="bitb-epk-header__dates">
            <span>Single: {dates.singleDisplayDate}</span>
            <span>Album: {dates.albumDisplayDate}</span>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-epk-bios"
        className="bitb-epk-bios"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-epk-bios__block bitb-surface" variants={childReveal}>
          <h2 className="bitb-epk-bios__label">Short Bio</h2>
          <p className="bitb-epk-bios__text">{artist.shortBio}</p>
        </motion.div>
        <motion.div className="bitb-epk-bios__block bitb-surface" variants={childReveal}>
          <h2 className="bitb-epk-bios__label">Full Bio</h2>
          <p className="bitb-epk-bios__text">{artist.longBio}</p>
        </motion.div>
      </motion.section>

      {focusTrack && (
        <motion.section
          id="bitb-epk-focus"
          className="bitb-epk-focus"
          {...getContainerProps(reduceMotion)}
        >
          <motion.div className="bitb-epk-focus__intro" variants={childReveal}>
            <span className="bitb-eyebrow">Focus Single</span>
            <h2 className="bitb-epk-focus__heading">The clean entry point into the album's world.</h2>
          </motion.div>
          <motion.div className="bitb-epk-focus__card bitb-surface" variants={childReveal}>
            <div className="bitb-epk-focus__copy">
              <h3 className="bitb-epk-focus__title">{focusTrack.title}</h3>
              <p className="bitb-epk-focus__meta">
                Track {focusTrack.number} · {focusTrack.duration}
              </p>
              <div className="bitb-epk-focus__tags">
                {focusTrack.themeTags.map((tag) => (
                  <span key={tag} className="bitb-epk-focus__tag">
                    {tag}
                  </span>
                ))}
              </div>
              {focusTrack.lyricExcerpt && (
                <blockquote className="bitb-epk-focus__lyric">{focusTrack.lyricExcerpt}</blockquote>
              )}
            </div>
            <div className="bitb-epk-focus__aside">
              <p className="bitb-epk-focus__summary">
                A cinematic meditation on revelation, grief, and the unbearable honesty that arrives when the light finally does.
              </p>
            </div>
          </motion.div>
        </motion.section>
      )}

      <motion.section
        id="bitb-epk-tags"
        className="bitb-epk-tags"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-epk-tags__group bitb-surface" variants={childReveal}>
          <h2 className="bitb-epk-tags__label">RIYL</h2>
          <div className="bitb-epk-tags__chips">
            {album.riyl.map((artistName) => (
              <span key={artistName} className="bitb-epk-tags__chip">
                {artistName}
              </span>
            ))}
          </div>
        </motion.div>
        <motion.div className="bitb-epk-tags__group bitb-surface" variants={childReveal}>
          <h2 className="bitb-epk-tags__label">Genres</h2>
          <div className="bitb-epk-tags__chips">
            {album.genres.map((genre) => (
              <span key={genre} className="bitb-epk-tags__chip">
                {genre}
              </span>
            ))}
          </div>
        </motion.div>
        <motion.div className="bitb-epk-tags__group bitb-surface" variants={childReveal}>
          <h2 className="bitb-epk-tags__label">Moods</h2>
          <div className="bitb-epk-tags__chips">
            {album.moods.map((mood) => (
              <span key={mood} className="bitb-epk-tags__chip">
                {mood}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-epk-tracklist"
        className="bitb-epk-tracklist"
        {...getRevealProps(reduceMotion)}
      >
        <div className="bitb-epk-tracklist__panel bitb-surface">
          <span className="bitb-eyebrow">Tracklist</span>
          <h2 className="bitb-epk-tracklist__heading">Six songs, one arc.</h2>
          <ol className="bitb-epk-tracklist__list">
            {tracks.map((track) => (
              <li key={track.id} className="bitb-epk-tracklist__item">
                <span className="bitb-epk-tracklist__number">{track.number}.</span>
                <span className="bitb-epk-tracklist__title">{track.title}</span>
                <span className="bitb-epk-tracklist__duration">{track.duration}</span>
                {track.isrc && (
                  <span className="bitb-epk-tracklist__isrc">ISRC: {track.isrc}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </motion.section>

      <motion.section
        id="bitb-epk-credits"
        className="bitb-epk-credits"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-epk-credits__panel bitb-surface" variants={childReveal}>
          <span className="bitb-eyebrow">Credits</span>
          <h2 className="bitb-epk-credits__heading">Release details</h2>
          <dl className="bitb-epk-credits__list">
            <dt>Written by</dt>
            <dd>{album.credits.writtenBy}</dd>
            <dt>Produced by</dt>
            <dd>{album.credits.producedBy}</dd>
            <dt>Label</dt>
            <dd>{album.label}</dd>
            {album.upc && (
              <>
                <dt>UPC</dt>
                <dd>{album.upc}</dd>
              </>
            )}
          </dl>
          <p className="bitb-epk-credits__ai-note">{album.credits.aiNote}</p>
        </motion.div>
        <motion.div className="bitb-epk-assets__panel bitb-surface" variants={childReveal}>
          <h2 className="bitb-epk-assets__heading">Downloadable Assets</h2>
          <div className="bitb-epk-assets__grid">
            {press.downloadableAssets.map((asset) => (
              <a
                key={asset.label}
                href={asset.file}
                download
                className="bitb-epk-assets__item"
                onClick={(event) => handleDownload(event, asset)}
              >
                <img
                  className="bitb-epk-assets__preview"
                  src={asset.file}
                  alt={asset.label}
                  draggable={false}
                />
                <span className="bitb-epk-assets__label">{asset.label}</span>
              </a>
            ))}
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-epk-contact"
        className="bitb-epk-contact"
        {...getRevealProps(reduceMotion)}
      >
        <div className="bitb-epk-contact__panel bitb-surface">
          <span className="bitb-eyebrow">Contact</span>
          <h2 className="bitb-epk-contact__heading">Direct contact and socials</h2>
          <a href={`mailto:${artist.contact}`} className="bitb-epk-contact__email">
            {artist.contact}
          </a>
          <div className="bitb-epk-contact__socials">
            {Object.entries(artist.socials).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                className="bitb-epk-contact__social"
                target="_blank"
                rel="noopener noreferrer"
                data-platform={platform}
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
