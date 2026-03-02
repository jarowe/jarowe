import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Howl, Howler } from 'howler';

const AudioContext = createContext(null);

export const sunoTracks = [
    { title: "Electric Dreams", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
    { title: "Neon Nights", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
    { title: "The Void Calls", artist: "Jarowe", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" }
];

// Shared AudioContext for analyser (separate from Howler's ctx when in HTML5 mode)
let sharedCtx = null;
function getAudioCtx() {
    if (!sharedCtx) {
        try { sharedCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    }
    return sharedCtx;
}

// Connect analyser to the HTML5 <audio> element via createMediaElementSource.
// This routes: <audio> → MediaElementSource → analyser → ctx.destination
// Audio is heard AND analysed. CORS may zero-out analyser data (synthetic fallback handles it).
function connectAnalyserToAudioEl(sound) {
    try {
        if (!sound || !sound._sounds || !sound._sounds[0]) return;
        const audioEl = sound._sounds[0]._node;
        if (!(audioEl instanceof HTMLAudioElement)) return;
        // createMediaElementSource can only be called ONCE per element
        if (audioEl._mediaSourceConnected) return;

        const ctx = getAudioCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        const source = ctx.createMediaElementSource(audioEl);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        window.globalAnalyser = analyser;
        audioEl._mediaSourceConnected = true;
    } catch (e) {
        console.warn('[Audio] createMediaElementSource failed:', e);
    }
}

// Fallback: branch-connect to Howler's masterGain (Web Audio mode)
function connectAnalyserToMasterGain() {
    if (!Howler.ctx || !Howler.masterGain) return;
    try {
        if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
        if (!window.globalAnalyser) {
            const analyser = Howler.ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.7;
            window.globalAnalyser = analyser;
        }
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

        const track = sunoTracks[index];
        trackIndexRef.current = index;

        const sound = new Howl({
            src: [track.src],
            format: ['mp3'],
            html5: true, // Stream immediately (no XHR wait) — fixes double-play issue
            onplay: () => {
                loadingRef.current = false;
                setIsPlaying(true);
                window.__musicPlaying = true;
                // Connect analyser to the <audio> element
                connectAnalyserToAudioEl(sound);
                // Also try masterGain fallback
                connectAnalyserToMasterGain();
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
                // Browser blocked autoplay — retry after unlock
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

        if (!soundRef.current) {
            playTrack(0);
            return;
        }

        if (isPlaying) {
            soundRef.current.pause();
            // onpause callback handles setIsPlaying(false)
        } else {
            soundRef.current.play();
            // onplay callback handles setIsPlaying(true)
        }
    };

    const handleNext = () => {
        loadingRef.current = false; // reset guard
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
