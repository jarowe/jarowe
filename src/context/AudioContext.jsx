import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Howl, Howler } from 'howler';
import tracks from '../data/tracks';

const AudioContext = createContext(null);

// Fisher-Yates shuffle — returns a new array of indices in random order
function shuffleIndices(length) {
    const arr = Array.from({ length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Branch-connect an AnalyserNode to Howler's masterGain (Web Audio mode).
// Audio flows: XHR download → decode → BufferSource → masterGain → destination
//              masterGain ──→ analyser (read-only tap for visualization)
// Same-origin audio = real frequency data. No CORS issues.
function connectAnalyser() {
    if (!Howler.ctx || !Howler.masterGain) return;
    try {
        if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
        if (!window.globalAnalyser) {
            const analyser = Howler.ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.7;
            window.globalAnalyser = analyser;
        }
        // Branch-connect (Web Audio deduplicates repeated connections)
        Howler.masterGain.connect(window.globalAnalyser);
    } catch (_) {}
}

export function AudioProvider({ children }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [volume, setVolumeState] = useState(() => {
        const saved = parseFloat(localStorage.getItem('jarowe_volume'));
        return isNaN(saved) ? 0.7 : saved;
    });
    const soundRef = useRef(null);
    const trackIndexRef = useRef(0);
    const loadingRef = useRef(false);

    // Shuffle state — true = random order, false = sequential
    const [shuffle, setShuffle] = useState(true);
    const shuffleRef = useRef(true);

    // Shuffle order created once on mount, re-shuffled when toggling on
    const [shuffledOrder, setShuffledOrder] = useState(() => shuffleIndices(tracks.length));
    const shufflePositionRef = useRef(0);

    const toggleShuffle = () => {
        const next = !shuffleRef.current;
        shuffleRef.current = next;
        setShuffle(next);
        if (next) {
            // Re-shuffle and place current track at position 0
            const newOrder = shuffleIndices(tracks.length);
            const cur = trackIndexRef.current;
            const idx = newOrder.indexOf(cur);
            if (idx > 0) { [newOrder[0], newOrder[idx]] = [newOrder[idx], newOrder[0]]; }
            setShuffledOrder(newOrder);
            shufflePositionRef.current = 0;
        }
    };

    // Initialize Howler global volume
    useEffect(() => {
        Howler.volume(volume);
    }, []);

    const setVolume = (v) => {
        const clamped = Math.max(0, Math.min(1, v));
        setVolumeState(clamped);
        Howler.volume(clamped);
        localStorage.setItem('jarowe_volume', clamped.toString());
    };

    const playTrack = (index) => {
        if (loadingRef.current) return;
        loadingRef.current = true;

        if (soundRef.current) {
            soundRef.current.unload();
        }

        // Resume AudioContext in user-gesture callstack
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }

        const track = tracks[index];
        trackIndexRef.current = index;

        const sound = new Howl({
            src: [track.src],
            format: ['mp3'],
            // Web Audio mode (default, no html5:true) — audio flows through masterGain
            // for real analyser data. Same-origin files avoid CORS issues.
            onload: () => {
                // Pre-connect analyser as soon as audio is decoded
                connectAnalyser();
            },
            onplay: () => {
                loadingRef.current = false;
                setIsPlaying(true);
                window.__musicPlaying = true;
                connectAnalyser();
            },
            onpause: () => {
                setIsPlaying(false);
                window.__musicPlaying = false;
            },
            onstop: () => {
                setIsPlaying(false);
                window.__musicPlaying = false;
            },
            onloaderror: (id, err) => {
                loadingRef.current = false;
                console.warn('[Audio] Load error:', err);
            },
            onplayerror: () => {
                loadingRef.current = false;
                if (Howler.ctx && Howler.ctx.state === 'suspended') {
                    Howler.ctx.resume().then(() => sound.play());
                }
            },
            onend: () => {
                if (shuffleRef.current) {
                    const nextPos = (shufflePositionRef.current + 1) % shuffledOrder.length;
                    shufflePositionRef.current = nextPos;
                    playTrack(shuffledOrder[nextPos]);
                } else {
                    playTrack((trackIndexRef.current + 1) % tracks.length);
                }
            }
        });

        soundRef.current = sound;
        sound.play();
        setCurrentTrackIndex(index);
    };

    const togglePlay = () => {
        if (loadingRef.current) return;

        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }

        if (!soundRef.current) {
            // Play the currently displayed track (tracks[0] on first load)
            // Find its position in shuffle order so next/prev work correctly
            const displayedIndex = trackIndexRef.current;
            const pos = shuffledOrder.indexOf(displayedIndex);
            shufflePositionRef.current = pos >= 0 ? pos : 0;
            playTrack(displayedIndex);
            return;
        }

        if (isPlaying) {
            soundRef.current.pause();
        } else {
            soundRef.current.play();
        }
    };

    const handleNext = () => {
        loadingRef.current = false;
        if (shuffleRef.current) {
            const nextPos = (shufflePositionRef.current + 1) % shuffledOrder.length;
            shufflePositionRef.current = nextPos;
            playTrack(shuffledOrder[nextPos]);
        } else {
            playTrack((trackIndexRef.current + 1) % tracks.length);
        }
    };

    const handlePrevious = () => {
        loadingRef.current = false;
        if (shuffleRef.current) {
            const prevPos = (shufflePositionRef.current - 1 + shuffledOrder.length) % shuffledOrder.length;
            shufflePositionRef.current = prevPos;
            playTrack(shuffledOrder[prevPos]);
        } else {
            playTrack((trackIndexRef.current - 1 + tracks.length) % tracks.length);
        }
    }

    // Pause current playback without unloading — used by release routes
    // to silence site music when entering a campaign context.
    // Does NOT auto-resume; user must press play again.
    const pausePlayback = () => {
        if (soundRef.current && isPlaying) {
            soundRef.current.pause();
        }
    };

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unload();
            }
        };
    }, []);

    // Listen for glint-action events for music control
    useEffect(() => {
        const handleGlintAction = (e) => {
            const { action, params } = e.detail || {};
            if (action === 'control_music' && params?.action) {
                if (params.action === 'play' && !isPlaying) togglePlay();
                else if (params.action === 'pause' && isPlaying) togglePlay();
                else if (params.action === 'next') handleNext();
            }
        };
        window.addEventListener('glint-action', handleGlintAction);
        return () => window.removeEventListener('glint-action', handleGlintAction);
    }, [isPlaying, togglePlay, handleNext]);

    // Track whether the home-page MusicCell is visible (IntersectionObserver)
    const [musicCellVisible, setMusicCellVisible] = useState(true);

    // Duck / restore for node-level audio (constellation panel music or unmuted video)
    const duckedRef = useRef(false);

    // Capsule-level ducking — GlobalPlayer fades to 0.15, not silence
    const capsuleDuckedRef = useRef(false);
    const preDuckVolumeRef = useRef(null);
    const duckForNodeAudio = () => {
        if (soundRef.current && isPlaying && !duckedRef.current) {
            duckedRef.current = true;
            soundRef.current.fade(soundRef.current.volume(), 0, 800);
        }
    };
    const restoreFromDuck = () => {
        if (duckedRef.current) {
            duckedRef.current = false;
            if (soundRef.current) {
                soundRef.current.fade(soundRef.current.volume(), 1.0, 800);
            }
        }
    };

    // Duck GlobalPlayer for capsule soundtrack — fade to 0.15 over 1s
    const duckForCapsule = () => {
        if (capsuleDuckedRef.current) return;
        capsuleDuckedRef.current = true;
        // IMPORTANT: Use Howler.volume() getter, NOT the `volume` React state.
        // `volume` is captured by closure and may be stale; Howler.volume()
        // returns the actual current global volume at call time.
        preDuckVolumeRef.current = Howler.volume();
        Howler.volume(0.15);
    };

    // Restore GlobalPlayer from capsule duck — fade back over 1s
    const restoreFromCapsule = () => {
        if (!capsuleDuckedRef.current) return;
        capsuleDuckedRef.current = false;
        const restoreTo = preDuckVolumeRef.current != null ? preDuckVolumeRef.current : 0.7;
        Howler.volume(restoreTo);
        preDuckVolumeRef.current = null;
    };

    const value = {
        isPlaying,
        currentTrackIndex,
        currentTrack: tracks[currentTrackIndex],
        tracks,
        togglePlay,
        playTrack,
        handleNext,
        handlePrevious,
        volume,
        setVolume,
        shuffle,
        toggleShuffle,
        pausePlayback,
        duckForNodeAudio,
        restoreFromDuck,
        duckForCapsule,
        restoreFromCapsule,
        musicCellVisible,
        setMusicCellVisible
    };

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
}

export const useAudio = () => useContext(AudioContext);
