import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHoliday } from '../context/HolidayContext';
import { GENERIC_TRIVIA } from '../data/holidayCalendar';
import confetti from 'canvas-confetti';
import './DailyTrivia.css';

const TOTAL_QUESTIONS = 3;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return function () {
    h = (h * 16807) % 2147483647;
    return (h - 1) / 2147483646;
  };
}

function pickQuestions(holiday) {
  const todayKey = getTodayKey();
  const rand = seededRandom(todayKey + (holiday?.name || ''));
  const pool = [];

  // Priority 1: Holiday-specific trivia
  if (holiday?.trivia && holiday.trivia.length > 0) {
    pool.push(...holiday.trivia);
  }

  // Priority 2: Fill remaining with generic trivia (seeded shuffle for consistency)
  if (pool.length < TOTAL_QUESTIONS) {
    const generics = [...GENERIC_TRIVIA];
    // Fisher-Yates shuffle with seeded random
    for (let i = generics.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [generics[i], generics[j]] = [generics[j], generics[i]];
    }
    const needed = TOTAL_QUESTIONS - pool.length;
    pool.push(...generics.slice(0, needed));
  }

  return pool.slice(0, TOTAL_QUESTIONS);
}

export default function DailyTrivia({ onClose }) {
  const { holiday } = useHoliday();
  const todayKey = getTodayKey();

  // Check if already played today
  const savedResult = useMemo(() => {
    const saved = localStorage.getItem(`jarowe_trivia_${todayKey}`);
    return saved ? JSON.parse(saved) : null;
  }, [todayKey]);

  const questions = useMemo(() => pickQuestions(holiday), [holiday]);

  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(savedResult !== null);
  const [answers, setAnswers] = useState(savedResult?.answers || []);
  const [finalScore, setFinalScore] = useState(savedResult?.score || 0);

  // If already played, show results immediately
  useEffect(() => {
    if (savedResult) {
      setFinalScore(savedResult.score);
      setAnswers(savedResult.answers);
      setShowResult(true);
    }
  }, [savedResult]);

  const handleAnswer = useCallback((answerIdx) => {
    if (selectedAnswer !== null) return; // Already answered
    setSelectedAnswer(answerIdx);
    const isCorrect = answerIdx === questions[currentQ].answer;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);
    const newAnswers = [...answers, { selected: answerIdx, correct: questions[currentQ].answer, isCorrect }];
    setAnswers(newAnswers);

    // Advance after feedback delay
    setTimeout(() => {
      if (currentQ + 1 >= TOTAL_QUESTIONS) {
        // All done
        setFinalScore(newScore);
        setShowResult(true);

        // Award XP via custom event
        const xpPerCorrect = 10;
        const perfectBonus = newScore === TOTAL_QUESTIONS ? 25 : 0;
        const totalXp = (newScore * xpPerCorrect) + perfectBonus;
        if (totalXp > 0) {
          window.dispatchEvent(new CustomEvent('add-xp', {
            detail: { amount: totalXp, reason: `Trivia: ${newScore}/${TOTAL_QUESTIONS}${perfectBonus ? ' (Perfect!)' : ''}` }
          }));
        }

        // Confetti on perfect score
        if (newScore === TOTAL_QUESTIONS) {
          const primary = holiday?.accentPrimary || '#7c3aed';
          const secondary = holiday?.accentSecondary || '#06b6d4';
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.5 },
            colors: [primary, secondary, '#fbbf24', '#ffffff'],
            gravity: 0.7,
            scalar: 1.1,
          });
        }

        // Save result
        localStorage.setItem(`jarowe_trivia_${todayKey}`, JSON.stringify({
          score: newScore,
          answers: newAnswers,
          holiday: holiday?.name || 'General',
        }));
      } else {
        setCurrentQ(currentQ + 1);
        setSelectedAnswer(null);
      }
    }, 1200);
  }, [selectedAnswer, currentQ, questions, score, answers, todayKey, holiday]);

  const resultMessages = [
    { min: 0, max: 0, msg: "Better luck tomorrow!", icon: "😅" },
    { min: 1, max: 1, msg: "Not bad! Keep exploring.", icon: "🤔" },
    { min: 2, max: 2, msg: "Nice! You know your stuff.", icon: "😎" },
    { min: 3, max: 3, msg: "Perfect score! You're a legend.", icon: "🏆" },
  ];
  const resultData = resultMessages.find(r => finalScore >= r.min && finalScore <= r.max) || resultMessages[0];

  return (
    <motion.div
      className="daily-trivia-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="daily-trivia-modal glass-panel"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          '--hb-primary': holiday?.accentPrimary || '#7c3aed',
          '--hb-secondary': holiday?.accentSecondary || '#06b6d4',
          '--hb-glow': holiday?.accentGlow || 'rgba(124,58,237,0.2)',
        }}
      >
        {/* Close button */}
        <button className="daily-trivia-close" onClick={onClose} aria-label="Close trivia">✕</button>

        {/* Header */}
        <div className="daily-trivia-header">
          <span className="daily-trivia-emoji">{holiday?.emoji || '🎯'}</span>
          <span className="daily-trivia-title">{holiday?.name || "Today's"} Trivia</span>
        </div>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key={`q-${currentQ}`}
              className="daily-trivia-question-area"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Question */}
              <div className="daily-trivia-question">
                {questions[currentQ]?.jaredQ && <span className="daily-trivia-jared-badge">Jared Q</span>}
                <p>{questions[currentQ]?.q}</p>
              </div>

              {/* Answer buttons */}
              <div className="daily-trivia-answers">
                {questions[currentQ]?.options.map((opt, idx) => {
                  let cls = 'daily-trivia-answer';
                  if (selectedAnswer !== null) {
                    if (idx === questions[currentQ].answer) cls += ' correct';
                    else if (idx === selectedAnswer) cls += ' wrong';
                    else cls += ' faded';
                  }
                  return (
                    <motion.button
                      key={idx}
                      className={cls}
                      onClick={() => handleAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                      whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                    >
                      <span className="daily-trivia-answer-letter">{String.fromCharCode(65 + idx)}</span>
                      {opt}
                    </motion.button>
                  );
                })}
              </div>

              {/* Progress dots */}
              <div className="daily-trivia-progress">
                {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                  <span
                    key={i}
                    className={`daily-trivia-dot${i === currentQ ? ' active' : ''}${i < currentQ ? ' done' : ''}`}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              className="daily-trivia-results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="daily-trivia-result-icon">{resultData.icon}</div>
              <div className="daily-trivia-result-score">
                {finalScore}/{TOTAL_QUESTIONS}
              </div>
              <div className="daily-trivia-result-msg">{resultData.msg}</div>

              {/* Show XP earned */}
              {!savedResult && (
                <div className="daily-trivia-xp">
                  +{(finalScore * 10) + (finalScore === TOTAL_QUESTIONS ? 25 : 0)} XP
                </div>
              )}

              {/* Answer recap */}
              <div className="daily-trivia-recap">
                {answers.map((a, i) => (
                  <div key={i} className={`daily-trivia-recap-item ${a.isCorrect ? 'correct' : 'wrong'}`}>
                    <span className="recap-indicator">{a.isCorrect ? '✓' : '✗'}</span>
                    <span className="recap-question">{questions[i]?.q}</span>
                  </div>
                ))}
              </div>

              <button className="daily-trivia-done" onClick={onClose}>Done</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
