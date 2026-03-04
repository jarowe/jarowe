import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Lock, Unlock, Zap, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { playClickSound, playHoverSound } from '../utils/sounds';
import { getTodayHoliday } from '../data/holidayCalendar';
import './DailyCipher.css';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const WORDS = [
    'VAULT', 'SPACE', 'REACT', 'AUDIO', 'BUILD', 'NOISE', 'MAKER', 'GLOBE', 'CODES', 'STARS',
    'PIXEL', 'SYNTH', 'ORBIT', 'CODEC', 'PATCH', 'STACK', 'CLOUD', 'PROBE', 'BLAZE', 'SPARK',
    'FLARE', 'DRIFT', 'CRAFT', 'FORGE', 'PRISM', 'NEXUS', 'SHARP', 'PULSE', 'WAVES', 'FOCUS',
    'LASER', 'CYBER', 'METAL', 'PIANO', 'ULTRA', 'TURBO', 'POWER', 'BRAIN', 'DREAM', 'LIGHT',
    'NIGHT', 'FLAME', 'STORM', 'QUEST', 'ROGUE', 'TRACK', 'PHASE', 'BLEND', 'CHAOS', 'UNITY',
    'CHILL', 'CRISP', 'LUCKY', 'MAGIC', 'SOLAR', 'GHOST', 'SWIFT', 'ROYAL', 'STONE', 'HONEY',
    'NORTH', 'ALPHA', 'OMEGA', 'BLISS', 'SONIC', 'VIRUS', 'ARMOR', 'BOOST', 'RAPID', 'BRAVE',
    'NOVEL', 'ATLAS', 'VERSE', 'WORLD', 'EARTH', 'OCEAN', 'MOUNT', 'TRAIL', 'RIDGE', 'COAST',
    'BYTES', 'LOGIC', 'VIVID', 'FRESH', 'CLIMB', 'SEEDS', 'GRIND', 'BLOOM', 'NOTES', 'BEATS',
    'LEVEL', 'SCOUT', 'HYPER', 'VAPOR', 'NEONS', 'RETRO', 'LUNAR', 'ASTRO', 'DRONE', 'VOXEL',
];

const BASE = import.meta.env.BASE_URL;

const vaultPhotos = [
    { id: 0, src: `${BASE}images/vault/velocicoaster.jpg`, name: 'VelociCoaster', rar: 'Legendary' },
    { id: 1, src: `${BASE}images/vault/hulk-coaster.jpg`, name: 'Incredible Hulk', rar: 'Epic' },
    { id: 2, src: `${BASE}images/vault/kraken-family.png`, name: 'Kraken', rar: 'Rare' },
    { id: 3, src: `${BASE}images/vault/penguin-trek.png`, name: 'Penguin Trek', rar: 'Beta' },
    { id: 4, src: `${BASE}images/vault/ice-breaker.png`, name: 'Ice Breaker', rar: 'Rare' },
    { id: 5, src: `${BASE}images/vault/mako-friends.jpg`, name: 'Mako', rar: 'Epic' },
    { id: 6, src: `${BASE}images/vault/manta-ride.jpg`, name: 'Manta', rar: 'Epic' },
    { id: 7, src: `${BASE}images/vault/mako-jace.jpg`, name: 'Mako II', rar: 'Rare' },
    { id: 8, src: `${BASE}images/vault/kraken-crew.jpg`, name: 'Kraken Squad', rar: 'Rare' },
    { id: 9, src: `${BASE}images/vault/mako-crew.jpg`, name: 'Mako Night Out', rar: 'Beta' },
    { id: 10, src: `${BASE}images/vault/mako-team.jpg`, name: 'Squadron', rar: 'Legendary' },
];

const getDailyData = () => {
    const today = new Date();
    const params = new URLSearchParams(window.location.search);
    const debugBirthday = params.get('birthday') === 'true';
    const isBday = debugBirthday || (today.getMonth() === 2 && today.getDate() === 3);

    if (isBday) {
        const bdayWords = ['PARTY', 'FORTY', 'BLAZE', 'SPARK', 'LIGHT'];
        const yearSeed = today.getFullYear();
        return {
            word: bdayWords[yearSeed % bdayWords.length],
            cardIndex: yearSeed % vaultPhotos.length
        };
    }

    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    // Holiday cipher words (T2+ holidays get themed words)
    const holiday = getTodayHoliday();
    if (holiday && holiday.cipherWords && holiday.cipherWords.length > 0 && holiday.tier >= 2) {
        const validWords = holiday.cipherWords.filter(w => w.length === WORD_LENGTH);
        if (validWords.length > 0) {
            return {
                word: validWords[seed % validWords.length],
                cardIndex: seed % vaultPhotos.length
            };
        }
    }

    return {
        word: WORDS[seed % WORDS.length],
        cardIndex: seed % vaultPhotos.length
    };
};

export default function DailyCipher({ showVault = false, debugGamesFolder }) {
    const [guesses, setGuesses] = useState([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameState, setGameState] = useState('playing'); // playing, won, lost
    const [dailyWord, setDailyWord] = useState('');
    const [dailyCardId, setDailyCardId] = useState(0);
    const [shake, setShake] = useState(false);

    const [unlockedCards, setUnlockedCards] = useState([]);
    const [showRewardSpash, setShowRewardSplash] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);

    const isBirthdayMode = typeof window !== 'undefined' && window.__birthdayMode;

    // Bonus cipher state
    const [mode, setMode] = useState('daily'); // 'daily' | 'bonus'
    const [bonusAvailable, setBonusAvailable] = useState(0);
    const [bonusWord, setBonusWord] = useState('');
    const [bonusCardId, setBonusCardId] = useState(0);
    const dailyStateRef = useRef({ guesses: [], gameState: 'playing' });

    // Computed active values based on mode
    const activeWord = mode === 'bonus' ? bonusWord : dailyWord;
    const activeCardId = mode === 'bonus' ? bonusCardId : dailyCardId;

    // 3D card tilt for hero card in splash view
    const heroCardRef = useRef(null);
    const handleHeroMouseMove = useCallback((e) => {
        const card = heroCardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -15;
        const rotateY = ((x - centerX) / centerX) * 15;
        // Holographic shine position
        const shineX = (x / rect.width) * 100;
        const shineY = (y / rect.height) * 100;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        const shine = card.querySelector('.hero-card-shine');
        if (shine) {
            shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`;
            shine.style.opacity = '1';
        }
        const foil = card.querySelector('.hero-card-foil');
        if (foil) {
            foil.style.backgroundPosition = `${shineX}% ${shineY}%`;
        }
    }, []);
    const handleHeroMouseLeave = useCallback(() => {
        const card = heroCardRef.current;
        if (!card) return;
        card.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        void card.offsetHeight;
        card.style.transform = '';
        const shine = card.querySelector('.hero-card-shine');
        if (shine) shine.style.opacity = '0';
    }, []);
    const handleHeroMouseEnter = useCallback(() => {
        const card = heroCardRef.current;
        if (!card) return;
        card.style.transition = 'none';
    }, []);

    // Mount: load daily data, collection, bonus ciphers, and restore state
    useEffect(() => {
        const data = getDailyData();
        setDailyWord(data.word);
        setDailyCardId(data.cardIndex);

        const storedStats = localStorage.getItem('jarowe_collection');
        if (storedStats) {
            setUnlockedCards(JSON.parse(storedStats));
        }

        // Load bonus cipher count
        const bonusCount = parseInt(localStorage.getItem('jarowe_bonus_ciphers') || '0', 10);
        setBonusAvailable(bonusCount);

        // Check for in-progress bonus cipher
        const bonusState = localStorage.getItem('jarowe_bonus_cipher_state');
        if (bonusState) {
            const parsed = JSON.parse(bonusState);
            if (parsed.gameState === 'playing') {
                // Resume bonus cipher
                setMode('bonus');
                setBonusWord(parsed.word);
                setBonusCardId(parsed.cardIndex);
                setGuesses(parsed.guesses || []);
                setGameState('playing');

                // Save daily state for later restoration
                const storedDaily = localStorage.getItem('dailyCipher');
                if (storedDaily) {
                    const dp = JSON.parse(storedDaily);
                    if (dp.date === new Date().toDateString()) {
                        dailyStateRef.current = { guesses: dp.guesses || [], gameState: dp.gameState || 'playing' };
                    }
                }
                return;
            } else {
                // Bonus cipher was completed, clean up
                localStorage.removeItem('jarowe_bonus_cipher_state');
            }
        }

        // Load daily state
        const storedState = localStorage.getItem('dailyCipher');
        if (storedState) {
            const parsed = JSON.parse(storedState);
            const todayStr = new Date().toDateString();
            if (parsed.date === todayStr) {
                setGuesses(parsed.guesses || []);
                setGameState(parsed.gameState || 'playing');
            }
        }
    }, []);

    // Save state based on mode
    useEffect(() => {
        if (mode === 'daily' && dailyWord) {
            localStorage.setItem('dailyCipher', JSON.stringify({
                date: new Date().toDateString(),
                guesses,
                gameState
            }));
        } else if (mode === 'bonus' && bonusWord) {
            localStorage.setItem('jarowe_bonus_cipher_state', JSON.stringify({
                word: bonusWord,
                cardIndex: bonusCardId,
                guesses,
                gameState
            }));
        }
    }, [guesses, gameState, dailyWord, bonusWord, mode, bonusCardId]);

    // Start a bonus cipher
    const startBonusCipher = useCallback(() => {
        playClickSound();

        // Save current daily state
        dailyStateRef.current = { guesses, gameState };

        // Decrement bonus available
        const newCount = bonusAvailable - 1;
        setBonusAvailable(newCount);
        localStorage.setItem('jarowe_bonus_ciphers', String(newCount));

        // Generate bonus word (avoid daily word)
        const dailyW = getDailyData().word;
        const seed = Date.now();
        let word;
        let i = 0;
        do {
            word = WORDS[(seed + i) % WORDS.length];
            i++;
        } while (word === dailyW && i < WORDS.length);

        // Pick a card to potentially unlock
        const collection = JSON.parse(localStorage.getItem('jarowe_collection') || '[]');
        let cardId = 0;
        for (let j = 0; j < vaultPhotos.length; j++) {
            if (!collection.includes(j)) {
                cardId = j;
                break;
            }
        }

        // Set bonus state
        setBonusWord(word);
        setBonusCardId(cardId);
        setGuesses([]);
        setCurrentGuess('');
        setGameState('playing');
        setMode('bonus');

        // Save bonus state
        localStorage.setItem('jarowe_bonus_cipher_state', JSON.stringify({
            word,
            cardIndex: cardId,
            guesses: [],
            gameState: 'playing'
        }));
    }, [bonusAvailable, guesses, gameState]);

    // Finish bonus cipher and return to daily
    const finishBonusCipher = useCallback(() => {
        playClickSound();
        localStorage.removeItem('jarowe_bonus_cipher_state');
        setMode('daily');
        setBonusWord('');
        setBonusCardId(0);
        // Restore daily state
        setGuesses(dailyStateRef.current.guesses);
        setGameState(dailyStateRef.current.gameState);
        setCurrentGuess('');
    }, []);

    const handleWin = () => {
        setGameState('won');
        playClickSound();

        let newUnlocked = [...unlockedCards];
        let cardToUnlock = activeCardId;

        // If they already have this card, give them the next locked one
        if (newUnlocked.includes(cardToUnlock)) {
            for (let i = 0; i < vaultPhotos.length; i++) {
                if (!newUnlocked.includes(i)) {
                    cardToUnlock = i;
                    break;
                }
            }
        }

        if (!newUnlocked.includes(cardToUnlock)) {
            newUnlocked.push(cardToUnlock);
            setUnlockedCards(newUnlocked);
            localStorage.setItem('jarowe_collection', JSON.stringify(newUnlocked));

            setTimeout(() => {
                setShowRewardSplash(cardToUnlock);
                confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.6 },
                    colors: mode === 'bonus'
                        ? ['#fbbf24', '#f59e0b', '#f472b6', '#7c3aed', '#22c55e']
                        : ['#7c3aed', '#38bdf8', '#f472b6', '#fbbf24', '#22c55e']
                });
                if (typeof window !== 'undefined' && window.__birthdayMode) {
                    setTimeout(() => confetti({
                        particleCount: 200,
                        spread: 360,
                        origin: { y: 0.5 },
                        colors: ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8'],
                    }), 300);
                }
            }, 1000);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState !== 'playing' || showRewardSpash !== false || selectedCard !== null) return;

            if (e.key === 'Enter') {
                if (currentGuess.length !== WORD_LENGTH) {
                    setShake(true);
                    setTimeout(() => setShake(false), 500);
                    return;
                }
                const newGuesses = [...guesses, currentGuess];
                setGuesses(newGuesses);

                if (currentGuess === activeWord) {
                    handleWin();
                } else if (newGuesses.length >= MAX_GUESSES) {
                    setGameState('lost');
                }
                setCurrentGuess('');
            } else if (e.key === 'Backspace') {
                setCurrentGuess(prev => prev.slice(0, -1));
            } else if (/^[A-Za-z]$/.test(e.key) && currentGuess.length < WORD_LENGTH) {
                setCurrentGuess(prev => prev + e.key.toUpperCase());
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentGuess, gameState, guesses, activeWord, showRewardSpash, selectedCard, unlockedCards, activeCardId, mode]);

    const getCharClasses = (char, index, guessWord) => {
        if (!activeWord) return '';
        if (activeWord[index] === char) return 'correct';
        if (activeWord.includes(char)) {
            const remainingTarget = Array.from(activeWord).filter((c, i) => c === char && guessWord[i] !== char).length;
            const previousGuessesOfChar = Array.from(guessWord.slice(0, index)).filter((c, i) => c === char && activeWord[i] !== char).length;
            if (previousGuessesOfChar < remainingTarget) return 'present';
        }
        return 'absent';
    };

    const isBonus = mode === 'bonus';
    const dailyDone = mode === 'daily' && (gameState === 'won' || gameState === 'lost');
    const showBonusButton = bonusAvailable > 0 && dailyDone;

    // ===== DEBUG PANEL (lil-gui) — activated by ?editor=jarowe =====
    const debugGuiRef = useRef(null);
    const debugActionsRef = useRef({});
    debugActionsRef.current = {
        setBonusAvailable, bonusAvailable,
        setUnlockedCards, unlockedCards,
        setGuesses, setCurrentGuess, setGameState, gameState,
        setMode, mode, setBonusWord, setBonusCardId,
        handleWin, startBonusCipher, finishBonusCipher,
        dailyWord, activeWord,
    };

    useEffect(() => {
        if (!debugGamesFolder) return;
        if (debugGuiRef.current) return;

        const gui = debugGamesFolder.addFolder('Cipher');
        debugGuiRef.current = gui;

        // === Bonus Ciphers ===
        const bonusFolder = gui.addFolder('Bonus Ciphers');
        const bonusProxy = { count: parseInt(localStorage.getItem('jarowe_bonus_ciphers') || '0', 10) };
        bonusFolder.add(bonusProxy, 'count', 0, 20, 1).name('Available').onChange(v => {
            localStorage.setItem('jarowe_bonus_ciphers', String(v));
            debugActionsRef.current.setBonusAvailable(v);
        });
        bonusFolder.add({ fn: () => {
            const c = parseInt(localStorage.getItem('jarowe_bonus_ciphers') || '0', 10) + 1;
            localStorage.setItem('jarowe_bonus_ciphers', String(c));
            debugActionsRef.current.setBonusAvailable(c);
            bonusProxy.count = c;
            gui.controllersRecursive().forEach(ctrl => ctrl.updateDisplay());
        }}, 'fn').name('Grant +1');
        bonusFolder.add({ fn: () => {
            const c = parseInt(localStorage.getItem('jarowe_bonus_ciphers') || '0', 10) + 5;
            localStorage.setItem('jarowe_bonus_ciphers', String(c));
            debugActionsRef.current.setBonusAvailable(c);
            bonusProxy.count = c;
            gui.controllersRecursive().forEach(ctrl => ctrl.updateDisplay());
        }}, 'fn').name('Grant +5');

        // === Vault Collection ===
        const vaultFolder = gui.addFolder('Vault');
        vaultFolder.add({ fn: () => {
            const current = JSON.parse(localStorage.getItem('jarowe_collection') || '[]');
            for (let i = 0; i < vaultPhotos.length; i++) {
                if (!current.includes(i)) {
                    current.push(i);
                    break;
                }
            }
            localStorage.setItem('jarowe_collection', JSON.stringify(current));
            debugActionsRef.current.setUnlockedCards([...current]);
        }}, 'fn').name('Unlock Next Card');
        vaultFolder.add({ fn: () => {
            const all = vaultPhotos.map((_, i) => i);
            localStorage.setItem('jarowe_collection', JSON.stringify(all));
            debugActionsRef.current.setUnlockedCards(all);
        }}, 'fn').name('Unlock ALL Cards');
        vaultFolder.add({ fn: () => {
            localStorage.setItem('jarowe_collection', JSON.stringify([]));
            debugActionsRef.current.setUnlockedCards([]);
        }}, 'fn').name('Clear Collection');

        // === Game State ===
        const gameFolder = gui.addFolder('Game State');
        gameFolder.add({ fn: () => {
            debugActionsRef.current.handleWin();
        }}, 'fn').name('Force Win');
        gameFolder.add({ fn: () => {
            debugActionsRef.current.setGameState('lost');
        }}, 'fn').name('Force Lose');
        gameFolder.add({ fn: () => {
            const w = debugActionsRef.current.activeWord;
            console.log('[Cipher Debug] Active word:', w);
            alert('Active word: ' + w);
        }}, 'fn').name('Reveal Word');
        gameFolder.add({ fn: () => {
            debugActionsRef.current.setGuesses([]);
            debugActionsRef.current.setCurrentGuess('');
            debugActionsRef.current.setGameState('playing');
            localStorage.removeItem('dailyCipher');
        }}, 'fn').name('Reset Daily');
        gameFolder.add({ fn: () => {
            localStorage.removeItem('jarowe_bonus_cipher_state');
            debugActionsRef.current.setMode('daily');
            debugActionsRef.current.setBonusWord('');
            debugActionsRef.current.setBonusCardId(0);
            debugActionsRef.current.setGuesses([]);
            debugActionsRef.current.setCurrentGuess('');
            debugActionsRef.current.setGameState('playing');
            const stored = localStorage.getItem('dailyCipher');
            if (stored) {
                const p = JSON.parse(stored);
                if (p.date === new Date().toDateString()) {
                    debugActionsRef.current.setGuesses(p.guesses || []);
                    debugActionsRef.current.setGameState(p.gameState || 'playing');
                }
            }
        }}, 'fn').name('Exit Bonus Mode');

        // === Reset cipher data ===
        gui.add({ fn: () => {
            if (!confirm('Reset all cipher data (daily, bonus, collection)?')) return;
            localStorage.removeItem('jarowe_collection');
            localStorage.removeItem('dailyCipher');
            localStorage.removeItem('jarowe_bonus_cipher_state');
            localStorage.removeItem('jarowe_bonus_ciphers');
            window.location.reload();
        }}, 'fn').name('Reset Cipher Data');

        // Collapse less-used folders
        vaultFolder.close();

        return () => {
            try { gui.destroy(); } catch (_) {}
            debugGuiRef.current = null;
        };
    }, [debugGamesFolder]);

    return (
        <div className={`cipher-vault-wrapper ${showVault ? 'with-vault' : ''}`}>

            {/* LEFT: CIPHER TERMINAL */}
            <div className={`cipher-terminal ${isBonus ? 'bonus-mode' : ''} ${gameState === 'playing' ? 'awaiting-input' : ''}${isBirthdayMode ? ' birthday-cipher' : ''}`}>
                <div className="terminal-header">
                    <div className="terminal-title">
                        {isBonus ? (
                            <>
                                <Sparkles size={16} className="text-bonus" />
                                <span>BONUS DECRYPT</span>
                            </>
                        ) : (
                            <>
                                <Zap size={16} className="text-accent" />
                                <span>NETWORK DECRYPT</span>
                            </>
                        )}
                    </div>
                    <div className={`terminal-status ${isBonus ? 'bonus' : ''}`}>
                        {gameState === 'playing' ? (isBonus ? 'SECRET INTEL...' : 'AWAITING INPUT...') : gameState === 'won' ? 'ACCESS GRANTED' : 'LOCKDOWN INITIATED'}
                    </div>
                </div>

                {/* Bonus availability badge */}
                {bonusAvailable > 0 && !isBonus && (
                    <div className="bonus-badge">
                        <Unlock size={12} />
                        <span>{bonusAvailable} BONUS {bonusAvailable === 1 ? 'CIPHER' : 'CIPHERS'} AVAILABLE</span>
                    </div>
                )}

                <div className="cipher-grid">
                    {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
                        const isCurrentRow = rowIndex === guesses.length;
                        const guess = isCurrentRow ? currentGuess : guesses[rowIndex] || '';
                        const isSubmitted = rowIndex < guesses.length;

                        const isActiveRow = isCurrentRow && gameState === 'playing';

                        return (
                            <div key={rowIndex} className={`cipher-row ${isCurrentRow && shake ? 'shake' : ''} ${isActiveRow ? 'active-row' : ''}`}>
                                {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                                    const char = guess[colIndex] || '';
                                    const isActiveCursor = isActiveRow && colIndex === currentGuess.length && currentGuess.length < WORD_LENGTH;
                                    let classNames = 'cipher-cell';
                                    if (isBonus) classNames += ' bonus';
                                    if (char) classNames += ' filled';
                                    if (isActiveCursor) classNames += ' active';
                                    if (isSubmitted) {
                                        classNames += ` submitted ${getCharClasses(char, colIndex, guess)}`;
                                    }

                                    return (
                                        <div key={colIndex} className={classNames} style={{ animationDelay: isSubmitted ? `${colIndex * 0.1}s` : undefined }}>
                                            <span className="cell-char">{char}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                <div className="terminal-footer">
                    <span>{isBonus ? 'SECRET' : 'KEY'}: [{activeWord.length} CHARS]</span>
                    <span>ATTEMPTS: {guesses.length}/{MAX_GUESSES}</span>
                </div>

                {/* Bonus activate button */}
                {showBonusButton && (
                    <motion.button
                        className="bonus-activate-btn"
                        onClick={startBonusCipher}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <Sparkles size={16} />
                        ACTIVATE BONUS CIPHER
                    </motion.button>
                )}

                {/* Lost overlay */}
                {gameState === 'lost' && (
                    <div className={`terminal-overlay lost ${isBonus ? 'bonus' : ''}`}>
                        <Lock size={32} />
                        <h3>{isBonus ? 'CIPHER EXPIRED' : 'FATAL ERROR'}</h3>
                        <p>{isBonus ? 'THE CODE WAS' : 'KEY WAS'}: {activeWord}</p>
                        {isBonus && (
                            <button className="bonus-return-btn" onClick={finishBonusCipher}>
                                RETURN TO DAILY
                            </button>
                        )}
                    </div>
                )}

                {/* Won overlay for bonus - show return button */}
                {gameState === 'won' && isBonus && showRewardSpash === false && (
                    <div className="terminal-overlay bonus-won">
                        <Unlock size={32} />
                        <h3>DECRYPTED!</h3>
                        <button className="bonus-return-btn" onClick={finishBonusCipher}>
                            RETURN TO DAILY
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT: CARD COLLECTION */}
            {showVault && (
                <div className="collection-visual">
                    <div className="collection-header">
                        <h3>THE ARCHIVE</h3>
                        <span className="collection-count">{unlockedCards.length} / {vaultPhotos.length} DISCOVERED</span>
                    </div>

                    <div className="cards-grid">
                        {vaultPhotos.map((item, idx) => {
                            const isUnlocked = unlockedCards.includes(idx);

                            return (
                                <div
                                    key={idx}
                                    className={`collection-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                                    onClick={() => {
                                        if (isUnlocked) {
                                            setSelectedCard(item);
                                            playClickSound();
                                        }
                                    }}
                                    onMouseMove={isUnlocked ? (e) => {
                                        const card = e.currentTarget;
                                        const rect = card.getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                                        const rotateX = ((y - 50) / 50) * -12;
                                        const rotateY = ((x - 50) / 50) * 12;
                                        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.08, 1.08, 1.08) translateY(-4px)`;
                                        const foil = card.querySelector('.card-foil');
                                        if (foil) {
                                            foil.style.opacity = '1';
                                            foil.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.5) 0%, rgba(220,215,255,0.15) 40%, transparent 70%)`;
                                        }
                                    } : undefined}
                                    onMouseEnter={isUnlocked ? (e) => {
                                        e.currentTarget.style.transition = 'none';
                                    } : undefined}
                                    onMouseLeave={isUnlocked ? (e) => {
                                        const card = e.currentTarget;
                                        card.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease';
                                        card.style.transform = '';
                                        const foil = card.querySelector('.card-foil');
                                        if (foil) foil.style.opacity = '0';
                                    } : undefined}
                                >
                                    {isUnlocked ? (
                                        <>
                                            <img src={item.src} alt={item.name} className="card-image" />
                                            <div className="card-foil"></div>
                                            <div className="card-info">
                                                <div className="card-name">{item.name}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="card-locked-state">
                                            <Lock size={20} className="locked-icon" />
                                            <div className="locked-glitch"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* REWARD OR FULL SCREEN CARD SPLASH */}
            <AnimatePresence>
                {(showRewardSpash !== false || selectedCard !== null) && (
                    <motion.div
                        className="card-splash-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            if (showRewardSpash !== false) setShowRewardSplash(false);
                            if (selectedCard !== null) setSelectedCard(null);
                            playClickSound();
                        }}
                    >
                        <motion.div
                            className="card-splash-container"
                            initial={{ scale: 0.8, y: 50, rotateY: 90 }}
                            animate={{ scale: 1, y: 0, rotateY: 0 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="splash-close" onClick={() => { setShowRewardSplash(false); setSelectedCard(null); playClickSound(); }}>
                                <X size={24} />
                            </button>

                            {showRewardSpash !== false && (
                                <div className={`reward-title ${isBonus ? 'bonus' : ''}`}>
                                    {isBonus ? 'BONUS RELIC ACQUIRED!' : 'NEW RELIC ACQUIRED!'}
                                </div>
                            )}

                            <div
                                className="hero-card"
                                ref={heroCardRef}
                                onMouseMove={handleHeroMouseMove}
                                onMouseLeave={handleHeroMouseLeave}
                                onMouseEnter={handleHeroMouseEnter}
                            >
                                <img
                                    src={vaultPhotos[showRewardSpash !== false ? showRewardSpash : selectedCard.id].src}
                                    alt="Hero Card"
                                />
                                <div className="hero-card-foil"></div>
                                <div className="hero-card-shine"></div>
                                <div className="hero-card-content">
                                    <div className="hero-card-rarity">{vaultPhotos[showRewardSpash !== false ? showRewardSpash : selectedCard.id].rar}</div>
                                    <div className="hero-card-title">{vaultPhotos[showRewardSpash !== false ? showRewardSpash : selectedCard.id].name}</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
