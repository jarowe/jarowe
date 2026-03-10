import React, { createContext, useState, useContext, useRef, useEffect, useMemo } from 'react';
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
    const soundRef = useRef(null);
    const trackIndexRef = useRef(0);
    const loadingRef = useRef(false);

    // Shuffle order created once on mount
    const shuffledOrder = useMemo(() => shuffleIndices(tracks.length), []);
    const shufflePositionRef = useRef(0);

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
                // Advance to next in shuffle order
                const nextPos = (shufflePositionRef.current + 1) % shuffledOrder.length;
                shufflePositionRef.current = nextPos;
                playTrack(shuffledOrder[nextPos]);
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
            // Start with first track in shuffle order
            shufflePositionRef.current = 0;
            playTrack(shuffledOrder[0]);
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
        const nextPos = (shufflePositionRef.current + 1) % shuffledOrder.length;
        shufflePositionRef.current = nextPos;
        playTrack(shuffledOrder[nextPos]);
    };

    const handlePrevious = () => {
        loadingRef.current = false;
        const prevPos = (shufflePositionRef.current - 1 + shuffledOrder.length) % shuffledOrder.length;
        shufflePositionRef.current = prevPos;
        playTrack(shuffledOrder[prevPos]);
    }

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unload();
            }
        };
    }, []);

    const value = {
        isPlaying,
        currentTrackIndex,
        currentTrack: tracks[currentTrackIndex],
        tracks,
        togglePlay,
        playTrack,
        handleNext,
        handlePrevious
    };

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
}

export const useAudio = () => useContext(AudioContext);
