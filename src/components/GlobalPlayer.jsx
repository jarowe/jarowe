import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Music2, Volume2 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useLocation } from 'react-router-dom';
import './GlobalPlayer.css';

function GlobalPlatformBadge({ platform }) {
    if (platform === "suno") {
        return (
            <svg className="global-platform-badge" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#1a1a2e"/>
                <path d="M12 4a1 1 0 0 1 1 1v6.26a3.5 3.5 0 1 1-2 0V5a1 1 0 0 1 1-1z" fill="#f7c948"/>
                <circle cx="12" cy="16.5" r="2" fill="#f7c948"/>
            </svg>
        );
    }
    if (platform === "soundcloud") {
        return (
            <svg className="global-platform-badge" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#ff5500"/>
                <path d="M5 14v-3a1 1 0 1 1 2 0v3H5zm3 0V9a1 1 0 1 1 2 0v5H8zm3 0V8a1 1 0 1 1 2 0v6h-2zm3 0V9.5a2.5 2.5 0 0 1 4.5 1.5v.5a1.5 1.5 0 0 1 0 3H14v-.5z" fill="#fff"/>
            </svg>
        );
    }
    if (platform === "spotify") {
        return (
            <svg className="global-platform-badge" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#1DB954"/>
                <path d="M16.5 10.5c-2.5-1.5-6.5-1.6-8.8-.9a.7.7 0 1 1-.4-1.3c2.7-.8 7.1-.7 9.9 1a.7.7 0 0 1-.7 1.2zm-.6 2.2c-2.1-1.3-5.3-1.7-7.8-.9a.6.6 0 1 1-.3-1.1c2.8-.8 6.3-.4 8.7 1.1a.6.6 0 0 1-.6 1zm-.7 2.1c-1.7-1-3.8-1.3-6.3-.7a.5.5 0 1 1-.2-1c2.7-.6 5-.3 6.9.8a.5.5 0 0 1-.4.9z" fill="#fff"/>
            </svg>
        );
    }
    return null;
}

export default function GlobalPlayer() {
    const { isPlaying, currentTrack, togglePlay, handleNext, handlePrevious, volume, setVolume, musicCellVisible } = useAudio();
    const location = useLocation();

    // Hide when no track, or on home page when MusicCell is still visible
    if (!currentTrack) return null;
    const isHomePage = location.pathname === '/' || location.pathname === '/world';
    if (isHomePage && musicCellVisible) return null;

    return (
        <div className="global-player">
            <div className="global-player-track-info">
                <div className="global-artwork-wrapper">
                    {currentTrack.artwork ? (
                        <img src={currentTrack.artwork} alt={currentTrack.title} className="global-artwork" />
                    ) : (
                        <div className={`global-art-icon ${isPlaying ? 'playing' : ''}`}>
                            <Music2 size={16} color="#fff" />
                        </div>
                    )}
                    {currentTrack.platform && <GlobalPlatformBadge platform={currentTrack.platform} />}
                </div>
                <div className="global-track-details">
                    <div className="global-song-title">{currentTrack.title}</div>
                    <div className="global-song-artist">{currentTrack.artist}</div>
                </div>
            </div>

            <div className="global-player-controls">
                <button onClick={handlePrevious} className="global-control-btn" aria-label="Previous track">
                    <SkipBack size={16} color="#fff" />
                </button>
                <button onClick={togglePlay} className="global-control-btn global-play-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={16} color="#000" /> : <Play size={16} color="#000" style={{ marginLeft: '2px' }} />}
                </button>
                <button onClick={handleNext} className="global-control-btn" aria-label="Next track">
                    <SkipForward size={16} color="#fff" />
                </button>
            </div>

            <div className="global-volume-wrap">
                <Volume2 size={12} color="#a1a1aa" />
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="global-volume-slider"
                    aria-label="Volume"
                />
            </div>
        </div>
    );
}
