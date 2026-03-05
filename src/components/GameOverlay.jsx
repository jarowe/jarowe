import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useCloudSync } from '../hooks/useCloudSync';
import { checkAchievements, gatherStats, ACHIEVEMENTS } from '../data/achievements';
import './GameOverlay.css';

export default function GameOverlay() {
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [recentGain, setRecentGain] = useState(null);
    const [holidayToast, setHolidayToast] = useState(null);
    const [achievementToast, setAchievementToast] = useState(null);
    const location = useLocation();
    const { syncXp, syncVisitedPaths, syncAchievement, initialSync } = useCloudSync();

    // Trigger cloud sync when user signs in
    useEffect(() => {
        const handler = () => { initialSync(); };
        window.addEventListener('auth-signed-in', handler);
        return () => window.removeEventListener('auth-signed-in', handler);
    }, [initialSync]);

    // Load XP from localStorage
    useEffect(() => {
        const savedXp = parseInt(localStorage.getItem('jarowe_xp') || '0', 10);
        setXp(savedXp);
        setLevel(Math.floor(savedXp / 100) + 1);
    }, []);

    // Check achievements and show toast for new unlocks
    const runAchievementCheck = useCallback((currentXp) => {
        try {
            const stats = gatherStats(currentXp);
            const unlocked = JSON.parse(localStorage.getItem('jarowe_achievements') || '[]');
            const newIds = checkAchievements(stats, unlocked);
            if (newIds.length > 0) {
                const updated = [...unlocked, ...newIds];
                localStorage.setItem('jarowe_achievements', JSON.stringify(updated));
                // Show toast for first new achievement
                const ach = ACHIEVEMENTS.find(a => a.id === newIds[0]);
                if (ach) {
                    setAchievementToast({ icon: ach.icon, name: ach.name, desc: ach.desc, id: Date.now() });
                    setTimeout(() => setAchievementToast(null), 4000);
                }
                // Sync all new achievements to cloud
                newIds.forEach(id => syncAchievement(id));
            }
        } catch (e) { /* silent */ }
    }, [syncAchievement]);

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

            // Cloud sync + achievement check
            syncXp(newXp);
            setTimeout(() => runAchievementCheck(newXp), 500);

            return newXp;
        });

        setRecentGain({ amount, reason, id: Date.now() });
        setTimeout(() => setRecentGain(null), 3000);
    }, [syncXp, runAchievementCheck]);

    // Track page visits for XP
    useEffect(() => {
        const visitedPaths = JSON.parse(localStorage.getItem('jarowe_visited_paths') || '[]');
        if (!visitedPaths.includes(location.pathname)) {
            visitedPaths.push(location.pathname);
            localStorage.setItem('jarowe_visited_paths', JSON.stringify(visitedPaths));
            syncVisitedPaths(visitedPaths);

            setTimeout(() => {
                addXp(50, `Explored: ${location.pathname === '/' ? 'The Hub' : location.pathname}`);
            }, 1000);
        }
    }, [location.pathname, addXp, syncVisitedPaths]);

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

    // Listen for cloud sync XP updates
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.xp != null) {
                setXp(e.detail.xp);
                setLevel(Math.floor(e.detail.xp / 100) + 1);
            }
        };
        window.addEventListener('xp-synced', handler);
        return () => window.removeEventListener('xp-synced', handler);
    }, []);

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

    // Holiday XP (T2: 25 XP, T3: 75 XP, once per holiday per year)
    // T3: confetti burst + celebration toast
    // T2: celebration toast
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hm = window.__holidayMode;
        if (!hm || hm.tier < 2 || window.__birthdayMode) return;
        const year = new Date().getFullYear();
        const safeKey = (hm.name || 'holiday').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const key = `jarowe_holiday_xp_${safeKey}_${year}`;
        if (localStorage.getItem(key) === 'true') return;
        const xpAmount = hm.tier >= 3 ? 75 : 25;

        const timer = setTimeout(() => {
            addXp(xpAmount, `${hm.emoji || '🎉'} ${hm.name}`);
            localStorage.setItem(key, 'true');

            // T3: confetti burst with holiday accent colors
            if (hm.tier >= 3) {
                confetti({
                    particleCount: 120,
                    spread: 90,
                    origin: { y: 0.4 },
                    colors: [
                        hm.accentPrimary || '#7c3aed',
                        hm.accentSecondary || '#06b6d4',
                        '#ffffff',
                        '#fbbf24',
                    ],
                    gravity: 0.7,
                    scalar: 1.2,
                });
            }

            // Show celebration toast for T2+
            setHolidayToast({
                emoji: hm.emoji || '🎉',
                name: hm.name || 'Holiday',
                xp: xpAmount,
                primary: hm.accentPrimary || '#7c3aed',
                glow: `${hm.accentPrimary || '#7c3aed'}40`,
                id: Date.now(),
            });
            setTimeout(() => setHolidayToast(null), 4000);
        }, 3000);
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
                {recentGain && !holidayToast && (
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

            {/* Holiday Celebration Toast */}
            <AnimatePresence>
                {holidayToast && (
                    <motion.div
                        key={holidayToast.id}
                        className="holiday-toast glass-panel"
                        initial={{ opacity: 0, scale: 0.6, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        style={{
                            '--ht-primary': holidayToast.primary,
                            '--ht-glow': holidayToast.glow,
                        }}
                    >
                        <div className="holiday-toast-emoji">{holidayToast.emoji}</div>
                        <div className="holiday-toast-name">{holidayToast.name}</div>
                        <div className="holiday-toast-xp">+{holidayToast.xp} XP</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Achievement Toast */}
            <AnimatePresence>
                {achievementToast && (
                    <motion.div
                        key={achievementToast.id}
                        className="achievement-toast glass-panel"
                        initial={{ opacity: 0, x: 80, y: 0 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 80 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <span className="achievement-toast-icon">{achievementToast.icon}</span>
                        <div className="achievement-toast-text">
                            <span className="achievement-toast-label">Achievement Unlocked!</span>
                            <span className="achievement-toast-name">{achievementToast.name}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
