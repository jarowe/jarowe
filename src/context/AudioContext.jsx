import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Howl, Howler } from 'howler';

const AudioContext = createContext(null);

export const sunoTracks = [
    { title: "Electric Dreams", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
    { title: "Neon Nights", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
    { title: "The Void Calls", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" }
];

// Branch-connect analyser to Howler's masterGain (read-only tap, never disconnect).
// AnalyserNode can read frequency data without being in the direct audio path.
function ensureAnalyser() {
    if (window.globalAnalyser || !Howler.ctx || !Howler.masterGain) return;
    try {
        if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
        const analyser = Howler.ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        // Branch: tap masterGain output, DON'T disconnect or re-route anything
        Howler.masterGain.connect(analyser);
        window.globalAnalyser = analyser;
    } catch (_) { /* AudioContext not ready */ }
}
// Retry periodically — Howler.ctx/masterGain may not exist when first sound plays
setInterval(() => {
    if (!window.globalAnalyser) ensureAnalyser();
}, 1000);

export function AudioProvider({ children }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const soundRef = useRef(null);
    const trackIndexRef = useRef(0);

    const playTrack = (index) => {
        if (soundRef.current) {
            soundRef.current.unload();
        }

        const track = sunoTracks[index];
        trackIndexRef.current = index;

        const sound = new Howl({
            src: [track.src],
            // Web Audio mode (no html5:true) — routes through masterGain for analyser reactivity
            onplay: () => ensureAnalyser(),
            onend: () => {
                // Use ref to avoid stale closure on currentTrackIndex
                const nextIndex = (trackIndexRef.current + 1) % sunoTracks.length;
                playTrack(nextIndex);
            }
        });

        soundRef.current = sound;
        sound.play();
        setIsPlaying(true);
        setCurrentTrackIndex(index);
    };

    const togglePlay = () => {
        if (!soundRef.current) {
            playTrack(0);
            return;
        }

        if (isPlaying) {
            soundRef.current.pause();
        } else {
            soundRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        const nextIndex = (trackIndexRef.current + 1) % sunoTracks.length;
        playTrack(nextIndex);
    };

    const handlePrevious = () => {
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
