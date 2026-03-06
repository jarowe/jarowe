import { useState, useCallback, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAMES } from '../data/gameRegistry';
import { getGameTheme, awardGameXP, isGameCompletedToday, markGameCompleted } from '../games/shared';
import { useCloudSync } from '../hooks/useCloudSync';
import { useAuth } from '../context/AuthContext';
import './GameLauncher.css';

export default function GameLauncher({ gameId, holiday, onClose }) {
  const game = GAMES[gameId];
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const theme = getGameTheme(holiday);
  const alreadyPlayed = isGameCompletedToday(gameId);
  const { fetchLeaderboard } = useCloudSync();
  const auth = useAuth();

  const handleComplete = useCallback((finalScore = 0) => {
    setCompleted(true);
    setScore(finalScore);
    if (!alreadyPlayed && game) {
      markGameCompleted(gameId);
      awardGameXP(game.xp, `${game.name}: ${finalScore} pts`);
    }
    // Dispatch game-complete event for Glint autonomy reactions
    window.dispatchEvent(new CustomEvent('game-complete', {
      detail: { gameId, won: finalScore > 0, score: finalScore, gameName: game?.name }
    }));
    // Fetch leaderboard for results screen
    fetchLeaderboard(gameId, 5).then(setLeaderboard);
  }, [alreadyPlayed, game, gameId, fetchLeaderboard]);

  if (!game) return null;

  const GameComponent = game.component;

  return (
    <motion.div
      className="game-launcher-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
      style={{
        '--gl-primary': theme.primary,
        '--gl-secondary': theme.secondary,
        '--gl-glow': theme.glow,
      }}
    >
      <motion.div
        className="game-launcher-modal"
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        {/* Close button */}
        <button className="game-launcher-close" onClick={onClose} aria-label="Close game">
          &times;
        </button>

        {!started && !completed && (
          <div className="game-launcher-splash">
            <div className="game-launcher-emoji">{theme.emoji}</div>
            <h2 className="game-launcher-title">{game.name}</h2>
            <p className="game-launcher-subtitle">{holiday?.name || 'Daily Game'}</p>
            <div className="game-launcher-meta">
              <span className="game-launcher-duration">{game.duration}</span>
              <span className="game-launcher-xp">+{game.xp} XP</span>
            </div>
            {alreadyPlayed && (
              <p className="game-launcher-replayed">Already played today (no XP)</p>
            )}
            <button className="game-launcher-start" onClick={() => setStarted(true)}>
              Play
            </button>
          </div>
        )}

        {started && !completed && (
          <Suspense fallback={
            <div className="game-launcher-loading">
              <div className="game-launcher-spinner" />
              <span>Loading...</span>
            </div>
          }>
            <GameComponent
              onComplete={handleComplete}
              onClose={onClose}
              holiday={holiday}
              theme={theme}
              variant={game.variant || null}
            />
          </Suspense>
        )}

        {completed && (
          <div className="game-launcher-results">
            <div className="game-launcher-emoji">{theme.emoji}</div>
            <h2 className="game-launcher-title">
              {score > 0 ? 'Nice!' : 'Complete!'}
            </h2>
            {score > 0 && (
              <p className="game-launcher-score">Score: {score}</p>
            )}
            {!alreadyPlayed && (
              <p className="game-launcher-xp-earned">+{game.xp} XP earned!</p>
            )}

            {/* Mini Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="game-launcher-leaderboard">
                <h3 className="gl-lb-title">Leaderboard</h3>
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`gl-lb-row${auth?.user?.id === entry.user_id ? ' gl-lb-me' : ''}`}
                  >
                    <span className="gl-lb-rank">#{i + 1}</span>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="gl-lb-avatar" />
                    ) : (
                      <span className="gl-lb-avatar gl-lb-avatar-placeholder" />
                    )}
                    <span className="gl-lb-name">{entry.display_name || 'Player'}</span>
                    <span className="gl-lb-score">{entry.score}</span>
                  </div>
                ))}
              </div>
            )}

            {!auth?.user && (
              <p className="game-launcher-signin-hint">Sign in to compete on leaderboards</p>
            )}

            <button className="game-launcher-start" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
