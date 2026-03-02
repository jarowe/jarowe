import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Howl, Howler } from 'howler';

const AudioContext = createContext(null);

const BASE = import.meta.env.BASE_URL;

export const sunoTracks = [
    { title: "Electric Dreams", artist: "Jarowe", src: `${BASE}audio/SoundHelix-Song-16.mp3` },
    { title: "Neon Nights", artist: "Jarowe", src: `${BASE}audio/SoundHelix-Song-13.mp3` },
    { title: "The Void Calls", artist: "Jarowe", src: `${BASE}audio/SoundHelix-Song-14.mp3` }
];

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

        const track = sunoTracks[index];
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
                const nextIndex = (trackIndexRef.current + 1) % sunoTracks.length;
                playTrack(nextIndex);
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
            playTrack(0);
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
        const nextIndex = (trackIndexRef.current + 1) % sunoTracks.length;
        playTrack(nextIndex);
    };

    const handlePrevious = () => {
        loadingRef.current = false;
        const prevIndex = (trackIndexRef.current - 1 + sunoTracks.length) % sunoTracks.length;
        playTrack(prevIndex);
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
        currentTrack: sunoTracks[currentTrackIndex],
        sunoTracks,
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
