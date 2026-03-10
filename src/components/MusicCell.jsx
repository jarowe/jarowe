import { useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music2, Volume2 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import './MusicCell.css';

const platformLabels = {
    suno: "Suno",
    soundcloud: "SoundCloud",
    spotify: "Spotify",
};

function PlatformBadge({ platform }) {
    if (platform === "suno") {
        return (
            <svg className="platform-badge" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#1a1a2e"/>
                <path d="M12 4a1 1 0 0 1 1 1v6.26a3.5 3.5 0 1 1-2 0V5a1 1 0 0 1 1-1z" fill="#f7c948"/>
                <circle cx="12" cy="16.5" r="2" fill="#f7c948"/>
            </svg>
        );
    }
    if (platform === "soundcloud") {
        return (
            <svg className="platform-badge" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#ff5500"/>
                <path d="M5 14v-3a1 1 0 1 1 2 0v3H5zm3 0V9a1 1 0 1 1 2 0v5H8zm3 0V8a1 1 0 1 1 2 0v6h-2zm3 0V9.5a2.5 2.5 0 0 1 4.5 1.5v.5a1.5 1.5 0 0 1 0 3H14v-.5z" fill="#fff"/>
            </svg>
        );
    }
    if (platform === "spotify") {
        return (
            <svg className="platform-badge" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#1DB954"/>
                <path d="M16.5 10.5c-2.5-1.5-6.5-1.6-8.8-.9a.7.7 0 1 1-.4-1.3c2.7-.8 7.1-.7 9.9 1a.7.7 0 0 1-.7 1.2zm-.6 2.2c-2.1-1.3-5.3-1.7-7.8-.9a.6.6 0 1 1-.3-1.1c2.8-.8 6.3-.4 8.7 1.1a.6.6 0 0 1-.6 1zm-.7 2.1c-1.7-1-3.8-1.3-6.3-.7a.5.5 0 1 1-.2-1c2.7-.6 5-.3 6.9.8a.5.5 0 0 1-.4.9z" fill="#fff"/>
            </svg>
        );
    }
    return null;
}

export default function MusicCell() {
    const { isPlaying, currentTrackIndex, currentTrack, tracks, togglePlay, handleNext, handlePrevious, volume, setVolume, setMusicCellVisible } = useAudio();
    const cellRef = useRef(null);

    // Track visibility for GlobalPlayer show/hide on home page
    useEffect(() => {
        const el = cellRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setMusicCellVisible(entry.isIntersecting),
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [setMusicCellVisible]);

    return (
        <div className="bento-content music-suno-active" ref={cellRef}>
            {/* Hero album art with vinyl disc */}
            <div className="music-showcase">
                <div className={`music-vinyl-wrap ${isPlaying ? 'out' : ''}`}>
                    <div className={`music-vinyl ${isPlaying ? 'spinning' : ''}`}>
                        <div className="vinyl-sheen" />
                        <div className="vinyl-label">
                            {currentTrack?.artwork && <img src={currentTrack.artwork} alt="" className="vinyl-label-img" />}
                        </div>
                    </div>
                </div>
                <div className="music-artwork-3d">
                    {currentTrack?.artwork ? (
                        <img src={currentTrack.artwork} alt={currentTrack.title} className="music-artwork" />
                    ) : (
                        <div className={`music-art-icon ${isPlaying ? 'playing' : ''}`}>
                            <Music2 size={40} color="#fff" />
                        </div>
                    )}
                    <div className="artwork-gloss" />
                </div>
            </div>

            <div className="music-top">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="now-playing">NOW SPINNING</div>
                    {currentTrack?.platformUrl && (
                        <a href={currentTrack.platformUrl} target="_blank" rel="noreferrer" className="music-platform-link">
                            {currentTrack.platform === 'spotify' && <PlatformBadge platform="spotify" />}
                            @jarowe on {platformLabels[currentTrack.platform] || currentTrack.platform}
                        </a>
                    )}
                </div>
            </div>

            <div className="music-meta">
                <div className="song-title">{currentTrack?.title || "No Track Selected"}</div>
                <div className="song-artist">{currentTrack?.artist || "--"}</div>
                <div style={{ fontSize: '0.7rem', color: '#777', marginTop: '4px' }}>{currentTrackIndex + 1} OF {tracks.length}</div>
            </div>

            <div className="music-controls-bar">
                <button onClick={handlePrevious} className="control-btn prev-btn" aria-label="Previous track">
                    <SkipBack size={20} color="#fff" />
                </button>
                <button onClick={togglePlay} className="control-btn play-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={20} color="#000" /> : <Play size={20} color="#000" style={{ marginLeft: '2px' }} />}
                </button>
                <button onClick={handleNext} className="control-btn next-btn" aria-label="Next track">
                    <SkipForward size={20} color="#fff" />
                </button>
            </div>

            <div className="music-bottom-row">
                <div className="music-volume-row">
                    <Volume2 size={14} color="#a1a1aa" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="music-volume-slider"
                        aria-label="Volume"
                    />
                </div>
                {currentTrack?.platformUrl && (
                    <a href={currentTrack.platformUrl} target="_blank" rel="noreferrer" className="music-platform-btn" title={`Open on ${platformLabels[currentTrack.platform] || currentTrack.platform}`}>
                        <PlatformBadge platform={currentTrack.platform} />
                    </a>
                )}
            </div>
        </div>
    );
}
