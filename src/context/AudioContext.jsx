import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Howl, Howler } from 'howler';

const AudioContext = createContext(null);

export const sunoTracks = [
    { title: "Electric Dreams", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
    { title: "Neon Nights", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
    { title: "The Void Calls", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" }
];

// Set up global analyser once Howler's AudioContext is available
function ensureAnalyser() {
    if (window.globalAnalyser || !Howler.ctx) return;
    try {
        const analyser = Howler.ctx.createAnalyser();
        analyser.fftSize = 128;
        if (Howler.masterGain) {
            Howler.masterGain.connect(analyser);
        }
        analyser.connect(Howler.ctx.destination);
        window.globalAnalyser = analyser;
    } catch (_) { /* AudioContext not ready */ }
}

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
