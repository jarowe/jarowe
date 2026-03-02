import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Howl, Howler } from 'howler';

const AudioContext = createContext(null);

export const sunoTracks = [
    { title: "Electric Dreams", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
    { title: "Neon Nights", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
    { title: "The Void Calls", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" }
];

// Force-connect analyser to Howler's audio graph.
// Called on EVERY play event to guarantee the connection is live.
// Web Audio API safely deduplicates connect() calls to the same destination.
function connectAnalyser(sound) {
    if (!Howler.ctx) return;
    try {
        // Resume suspended AudioContext (requires user gesture — onplay IS user-triggered)
        if (Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }

        // Create analyser once
        if (!window.globalAnalyser) {
            const analyser = Howler.ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.7;
            window.globalAnalyser = analyser;
        }

        // Connect masterGain → analyser (branch tap, safe to call repeatedly)
        if (Howler.masterGain) {
            Howler.masterGain.connect(window.globalAnalyser);
        }

        // ALSO connect the per-sound GainNode directly for redundancy.
        // In Web Audio mode, sound._sounds[0]._node is a GainNode.
        // In HTML5 mode, it's an <audio> element (no .connect method).
        if (sound && sound._sounds) {
            for (let i = 0; i < sound._sounds.length; i++) {
                const snd = sound._sounds[i];
                if (snd && snd._node && typeof snd._node.connect === 'function') {
                    snd._node.connect(window.globalAnalyser);
                }
            }
        }

        // Mark that music is playing (used as fallback for synthetic reactivity)
        window.__musicPlaying = true;
    } catch (e) {
        console.warn('[AudioContext] connectAnalyser failed:', e);
    }
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
            format: ['mp3'],
            // Web Audio mode (no html5:true) — routes through masterGain for analyser
            onplay: () => {
                // Re-connect on every play to handle track changes, unload/reload cycles
                connectAnalyser(sound);
            },
            onend: () => {
                const nextIndex = (trackIndexRef.current + 1) % sunoTracks.length;
                playTrack(nextIndex);
            }
        });

        soundRef.current = sound;
        sound.play();
        setIsPlaying(true);
        setCurrentTrackIndex(index);

        // Also connect immediately after play() — belt and suspenders
        // Small delay to let Howler set up the internal audio nodes
        setTimeout(() => connectAnalyser(sound), 100);
    };

    const togglePlay = () => {
        if (!soundRef.current) {
            playTrack(0);
            return;
        }

        if (isPlaying) {
            soundRef.current.pause();
            window.__musicPlaying = false;
        } else {
            soundRef.current.play();
            window.__musicPlaying = true;
            // Reconnect analyser on resume too
            setTimeout(() => connectAnalyser(soundRef.current), 100);
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
