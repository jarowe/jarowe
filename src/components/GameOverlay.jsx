import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './GameOverlay.css';

export default function GameOverlay() {
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [recentGain, setRecentGain] = useState(null);
    const location = useLocation();

    // Load XP from localStorage
    useEffect(() => {
        const savedXp = parseInt(localStorage.getItem('jarowe_xp') || '0', 10);
        setXp(savedXp);
        setLevel(Math.floor(savedXp / 100) + 1);
    }, []);

    const addXp = useCallback((amount, reason) => {
        setXp(prev => {
            const newXp = prev + amount;
            localStorage.setItem('jarowe_xp', newXp.toString());

            const newLevel = Math.floor(newXp / 100) + 1;
            const oldLevel = Math.floor(prev / 100) + 1;

            if (newLevel > oldLevel) {
                const bdayColors = (typeof window !== 'undefined' && window.__birthdayMode)
                    ? ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e']
                    : ['#7c3aed', '#0ea5e9', '#f472b6'];
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.8 },
                    colors: bdayColors
                });
            }

            setLevel(newLevel);
            return newXp;
        });

        setRecentGain({ amount, reason, id: Date.now() });
        setTimeout(() => setRecentGain(null), 3000);
    }, []);

    // Track page visits for XP
    useEffect(() => {
        const visitedPaths = JSON.parse(localStorage.getItem('jarowe_visited_paths') || '[]');
        if (!visitedPaths.includes(location.pathname)) {
            visitedPaths.push(location.pathname);
            localStorage.setItem('jarowe_visited_paths', JSON.stringify(visitedPaths));

            setTimeout(() => {
                addXp(50, `Explored: ${location.pathname === '/' ? 'The Hub' : location.pathname}`);
            }, 1000);
        }
    }, [location.pathname, addXp]);

    // Konami Code Easter Egg
    useEffect(() => {
        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;

        const handleKeyDown = (e) => {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    addXp(200, "Secret Found: Konami Code!");
                    document.body.classList.add('retro-mode');
                    setTimeout(() => document.body.classList.remove('retro-mode'), 10000);
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [addXp]);

    // Listen for XP events from mini-games
    useEffect(() => {
        const handler = (e) => {
            if (e.detail && e.detail.amount) {
                addXp(e.detail.amount, e.detail.reason || 'Mini-game bonus');
            }
        };
        window.addEventListener('add-xp', handler);
        return () => window.removeEventListener('add-xp', handler);
    }, [addXp]);

    // Birthday visitor XP
    useEffect(() => {
        if (typeof window === 'undefined' || !window.__birthdayMode) return;
        const year = new Date().getFullYear();
        const key = `jarowe_birthday_xp_${year}`;
        if (localStorage.getItem(key) === 'true') return;
        const timer = setTimeout(() => {
            addXp(100, "Happy Birthday! \u{1F382}");
            localStorage.setItem(key, 'true');
        }, 2000);
        return () => clearTimeout(timer);
    }, [addXp]);

    return (
        <div className="game-overlay">
            <div className="xp-container glass-panel">
                <div className="level-badge">LVL {level}</div>
                <div className="xp-bar-wrapper">
                    <div className="xp-bar" style={{ width: `${(xp % 100)}%` }}></div>
                </div>
                <div className="xp-text">{xp} XP</div>
            </div>

            <AnimatePresence>
                {recentGain && (
                    <motion.div
                        key={recentGain.id}
                        className="xp-notification glass-panel"
                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                    >
                        <span className="gain-amount">+{recentGain.amount} XP</span>
                        <span className="gain-reason">{recentGain.reason}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
