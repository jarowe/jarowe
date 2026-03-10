import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipForward, SkipBack, Shuffle, Volume2, Music2, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { getSpotifyAlbums, getSoundCloudTracks, findTrackIndex } from '../utils/trackHelpers';
import './MusicPlayerModal.css';

/* ── Platform SVG badges (same as MusicCell) ── */
function PlatformBadge({ platform, size = 20 }) {
    if (platform === 'soundcloud') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#ff5500"/>
            <path d="M5 14v-3a1 1 0 1 1 2 0v3H5zm3 0V9a1 1 0 1 1 2 0v5H8zm3 0V8a1 1 0 1 1 2 0v6h-2zm3 0V9.5a2.5 2.5 0 0 1 4.5 1.5v.5a1.5 1.5 0 0 1 0 3H14v-.5z" fill="#fff"/></svg>
        );
    }
    if (platform === 'spotify') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#1DB954"/>
            <path d="M16.5 10.5c-2.5-1.5-6.5-1.6-8.8-.9a.7.7 0 1 1-.4-1.3c2.7-.8 7.1-.7 9.9 1a.7.7 0 0 1-.7 1.2zm-.6 2.2c-2.1-1.3-5.3-1.7-7.8-.9a.6.6 0 1 1-.3-1.1c2.8-.8 6.3-.4 8.7 1.1a.6.6 0 0 1-.6 1zm-.7 2.1c-1.7-1-3.8-1.3-6.3-.7a.5.5 0 1 1-.2-1c2.7-.6 5-.3 6.9.8a.5.5 0 0 1-.4.9z" fill="#fff"/></svg>
        );
    }
    return null;
}

const platformLabels = { spotify: 'Spotify', soundcloud: 'SoundCloud' };

/* ── Audio-reactive glow canvas ── */
function ReactiveGlow({ artRef }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const dataRef = useRef(new Uint8Array(128));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const SIZE = 400;
        canvas.width = SIZE;
        canvas.height = SIZE;

        // Glow color palette — 4 layers with different hue offsets
        const layers = [
            { color: [124, 58, 237], radius: 0.42, freqBand: [0, 4] },    // purple — bass
            { color: [56, 189, 248], radius: 0.35, freqBand: [4, 12] },   // cyan — low-mid
            { color: [244, 114, 182], radius: 0.30, freqBand: [12, 28] }, // pink — mid
            { color: [251, 191, 36], radius: 0.22, freqBand: [28, 64] },  // gold — high
        ];

        let smoothed = layers.map(() => 0);

        const draw = () => {
            rafRef.current = requestAnimationFrame(draw);

            const analyser = window.globalAnalyser;
            if (analyser) {
                analyser.getByteFrequencyData(dataRef.current);
            }

            ctx.clearRect(0, 0, SIZE, SIZE);
            const cx = SIZE / 2;
            const cy = SIZE / 2;

            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                const [lo, hi] = layer.freqBand;
                let sum = 0;
                for (let j = lo; j < hi && j < dataRef.current.length; j++) {
                    sum += dataRef.current[j];
                }
                const avg = sum / (hi - lo) / 255;
                // Smooth with exponential decay
                smoothed[i] += (avg - smoothed[i]) * 0.15;
                const intensity = smoothed[i];

                // Base glow always visible at ~0.08, reactive up to ~0.35
                const alpha = 0.06 + intensity * 0.3;
                const spread = layer.radius * SIZE * (0.85 + intensity * 0.4);
                const [r, g, b] = layer.color;

                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
                grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, SIZE, SIZE);
            }
        };

        draw();
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    return <canvas ref={canvasRef} className="music-modal-glow-canvas" />;
}


export default function MusicPlayerModal({ onClose }) {
    const {
        isPlaying, currentTrackIndex, currentTrack, tracks,
        togglePlay, playTrack, handleNext, handlePrevious,
        volume, setVolume, shuffle, toggleShuffle
    } = useAudio();

    const [tab, setTab] = useState('albums');
    const [artExpanded, setArtExpanded] = useState(false);
    const activeRef = useRef(null);
    const artRef = useRef(null);

    const spotifyAlbums = getSpotifyAlbums(tracks);
    const soundcloudTracks = getSoundCloudTracks(tracks);

    // Scroll active track into view
    useEffect(() => {
        if (activeRef.current && !artExpanded) {
            activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [currentTrackIndex, tab, artExpanded]);

    // Escape key — collapse art first, then close modal
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (artExpanded) setArtExpanded(false);
                else onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, artExpanded]);

    const handleTrackClick = useCallback((track) => {
        const idx = findTrackIndex(tracks, track);
        if (idx >= 0) playTrack(idx);
    }, [tracks, playTrack]);

    // Switch tab to match current track platform on mount
    useEffect(() => {
        if (currentTrack?.platform === 'soundcloud') setTab('singles');
        else setTab('albums');
    }, []);

    const toggleArtExpand = useCallback(() => setArtExpanded(prev => !prev), []);

    return (
        <motion.div
            className="music-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                className={`music-modal-card${artExpanded ? ' art-expanded' : ''}`}
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
                <button className="music-modal-close" onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                {/* Left: Hero artwork with reactive glow */}
                <div className="music-modal-hero">
                    <div className="music-modal-art-container">
                        <ReactiveGlow artRef={artRef} />
                        <div className="music-modal-art-wrap" ref={artRef} onClick={toggleArtExpand}>
                            {currentTrack?.artwork ? (
                                <>
                                    <img src={currentTrack.artwork} alt={currentTrack.title} className="music-modal-art" />
                                    <div className="music-modal-art-gloss" />
                                </>
                            ) : (
                                <div className="music-modal-art-fallback">
                                    <Music2 size={64} color="#fff" />
                                </div>
                            )}
                            <button
                                className="music-modal-art-toggle"
                                onClick={(e) => { e.stopPropagation(); toggleArtExpand(); }}
                                aria-label={artExpanded ? 'Collapse artwork' : 'Expand artwork'}
                            >
                                {artExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="music-modal-now-info">
                        <div className="music-modal-now-title">{currentTrack?.title || 'No Track'}</div>
                        <div className="music-modal-now-artist">{currentTrack?.artist || '--'}</div>
                        {currentTrack?.platformUrl && (
                            <a href={currentTrack.platformUrl} target="_blank" rel="noreferrer" className="music-modal-platform-link">
                                <PlatformBadge platform={currentTrack.platform} size={18} />
                                <span>Listen on {platformLabels[currentTrack.platform] || currentTrack.platform}</span>
                                <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                </div>

                {/* Right: Tabs + tracklist + controls — slides out when art expanded */}
                <div className="music-modal-right">
                    <div className="music-modal-tabs">
                        <button
                            className={`music-modal-tab${tab === 'albums' ? ' active' : ''}`}
                            onClick={() => setTab('albums')}
                        >
                            Albums
                        </button>
                        <button
                            className={`music-modal-tab${tab === 'singles' ? ' active' : ''}`}
                            onClick={() => setTab('singles')}
                        >
                            Singles
                        </button>
                    </div>

                    <div className="music-modal-tracklist">
                        {tab === 'albums' && spotifyAlbums.map((album) => (
                            <div key={album.album} className="music-modal-album">
                                <div className="music-modal-album-header">
                                    {album.artwork && (
                                        <img src={album.artwork} alt={album.album} className="music-modal-album-thumb" />
                                    )}
                                    <div>
                                        <div className="music-modal-album-name">{album.album}</div>
                                        <div className="music-modal-album-count">{album.tracks.length} tracks</div>
                                    </div>
                                </div>
                                {album.tracks.map((track, i) => {
                                    const globalIdx = findTrackIndex(tracks, track);
                                    const isActive = globalIdx === currentTrackIndex;
                                    return (
                                        <div
                                            key={track.src}
                                            ref={isActive ? activeRef : null}
                                            className={`music-modal-track${isActive ? ' active' : ''}`}
                                            onClick={() => handleTrackClick(track)}
                                        >
                                            <span className="music-modal-track-index">
                                                {isActive ? (
                                                    <div className={`music-modal-eq${!isPlaying ? ' paused' : ''}`}>
                                                        <div className="music-modal-eq-bar" />
                                                        <div className="music-modal-eq-bar" />
                                                        <div className="music-modal-eq-bar" />
                                                        <div className="music-modal-eq-bar" />
                                                    </div>
                                                ) : i + 1}
                                            </span>
                                            <div className="music-modal-track-info">
                                                <div className="music-modal-track-name">{track.title}</div>
                                                <div className="music-modal-track-artist">{track.artist}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {tab === 'singles' && soundcloudTracks.map((track, i) => {
                            const globalIdx = findTrackIndex(tracks, track);
                            const isActive = globalIdx === currentTrackIndex;
                            return (
                                <div
                                    key={track.src}
                                    ref={isActive ? activeRef : null}
                                    className={`music-modal-track${isActive ? ' active' : ''}`}
                                    onClick={() => handleTrackClick(track)}
                                >
                                    <span className="music-modal-track-index">
                                        {isActive ? (
                                            <div className={`music-modal-eq${!isPlaying ? ' paused' : ''}`}>
                                                <div className="music-modal-eq-bar" />
                                                <div className="music-modal-eq-bar" />
                                                <div className="music-modal-eq-bar" />
                                                <div className="music-modal-eq-bar" />
                                            </div>
                                        ) : i + 1}
                                    </span>
                                    {track.artwork && (
                                        <img src={track.artwork} alt="" className="music-modal-track-thumb" />
                                    )}
                                    <div className="music-modal-track-info">
                                        <div className="music-modal-track-name">{track.title}</div>
                                        <div className="music-modal-track-artist">{track.artist}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom transport controls */}
                    <div className="music-modal-controls">
                        <button onClick={toggleShuffle} className={`control-btn shuffle-btn${shuffle ? ' active' : ''}`} aria-label="Toggle shuffle">
                            <Shuffle size={14} color={shuffle ? '#7c3aed' : '#fff'} />
                        </button>
                        <button onClick={handlePrevious} className="control-btn prev-btn" aria-label="Previous">
                            <SkipBack size={16} color="#fff" />
                        </button>
                        <button onClick={togglePlay} className="control-btn play-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause size={18} color="#000" /> : <Play size={18} color="#000" style={{ marginLeft: '2px' }} />}
                        </button>
                        <button onClick={handleNext} className="control-btn next-btn" aria-label="Next">
                            <SkipForward size={16} color="#fff" />
                        </button>
                        <div className="music-modal-vol">
                            <Volume2 size={14} color="#a1a1aa" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="music-modal-vol-slider"
                                aria-label="Volume"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
