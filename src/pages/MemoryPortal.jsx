import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Howl } from 'howler';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { getSceneById } from '../data/memoryScenes';
import './MemoryPortal.css';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

export default function MemoryPortal() {
  const { sceneId } = useParams();
  const scene = getSceneById(sceneId);

  const [visibleCards, setVisibleCards] = useState([]);
  const [muted, setMuted] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const soundRef = useRef(null);

  // Parallax mouse tracking
  const handleMouseMove = useCallback((e) => {
    setMousePos({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // --- Soundtrack lifecycle ---
  useEffect(() => {
    if (!scene.soundtrack) return;
    const soundPath = resolveAsset(scene.soundtrack);
    if (!soundPath) return;

    const sound = new Howl({
      src: [soundPath],
      volume: 0,
      loop: true,
      onload: () => setSoundReady(true),
      onloaderror: () => {},
    });
    soundRef.current = sound;
    sound.play();

    return () => {
      sound.unload();
      soundRef.current = null;
      setSoundReady(false);
      setMuted(true);
    };
  }, [scene.soundtrack]);

  // --- Narrative card sequencing ---
  useEffect(() => {
    if (!scene.narrative?.length) return;
    const timers = scene.narrative.map((card, i) =>
      setTimeout(() => setVisibleCards((prev) => [...prev, i]), card.delay)
    );
    return () => {
      timers.forEach(clearTimeout);
      setVisibleCards([]);
    };
  }, [scene.narrative]);

  const handleUnmute = useCallback(() => {
    if (!soundRef.current) return;
    if (muted) {
      soundRef.current.fade(0, 0.6, 2000);
      setMuted(false);
    } else {
      soundRef.current.fade(soundRef.current.volume(), 0, 500);
      setMuted(true);
    }
  }, [muted]);

  const previewUrl = resolveAsset(scene.previewImage);

  // Parallax transform values
  const px = (mousePos.x - 0.5) * 20;
  const py = (mousePos.y - 0.5) * 12;

  return (
    <div className="memory-portal">
      {/* Immersive background layers with parallax */}
      <div className="memory-portal__bg">
        {previewUrl && (
          <motion.div
            className="memory-portal__hero-image"
            style={{
              backgroundImage: `url(${previewUrl})`,
              x: px,
              y: py,
            }}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            transition={{ duration: 3, ease: 'easeOut' }}
          />
        )}
        {/* Atmospheric overlays */}
        <div className="memory-portal__vignette" />
        <motion.div
          className="memory-portal__grain"
          animate={{ opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="memory-portal__light-leak"
          style={{ x: px * 2, y: py * 2 }}
        />
      </div>

      {/* Back button */}
      <div className="memory-back">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      {/* Scene title */}
      <motion.div
        className="memory-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <span>MEMORY LANE</span>
      </motion.div>

      {/* Center title card */}
      <motion.div
        className="memory-portal__center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}
      >
        <h1 className="memory-portal__scene-title">{scene.title}</h1>
        <p className="memory-portal__scene-location">{scene.location}</p>
      </motion.div>

      {/* Narrative overlay */}
      <div className="memory-narrative">
        <AnimatePresence>
          {scene.narrative
            .filter((_, i) => visibleCards.includes(i))
            .map((card, idx) => (
              <motion.div
                key={idx}
                className="memory-narrative-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                {card.text}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Unmute button */}
      {scene.soundtrack && soundReady && (
        <button
          className="memory-unmute"
          onClick={handleUnmute}
          aria-label={muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}
    </div>
  );
}
