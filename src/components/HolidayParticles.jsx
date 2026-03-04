import { useMemo } from 'react';
import { useHoliday } from '../context/HolidayContext';

// Particle emoji/character sets per category particle type
const PARTICLE_CHARS = {
  stars:    ['✦', '✧', '⋆', '★', '✫', '✬'],
  notes:    ['♪', '♫', '♬', '🎵', '🎶'],
  circuits: ['⚡', '◈', '⬡', '◉', '⊕'],
  sparkles: ['✨', '⭐', '💫', '✦'],
  hearts:   ['❤️', '💕', '💖', '💗', '💜'],
  leaves:   ['🍃', '🌿', '🍂', '🌱', '☘️'],
  warp:     ['✦', '◆', '✧', '⊹', '⋆'],
  compass:  ['⚓', '⭐', '🧭', '⚔️', '✦'],
  confetti: ['🎉', '🎊', '✨', '⭐', '💥'],
  film:     ['🎬', '✦', '🎭', '✧', '⭐'],
  ghosts:   ['👻', '🦇', '💀', '🕷️', '🎃'],
  snow:     ['❄️', '❅', '❆', '✧', '⋆'],
  balloons: ['🎈', '🎉', '✨', '⭐', '🎊'],
};

export default function HolidayParticles() {
  const ctx = useHoliday();
  if (!ctx) return null;

  const { holiday, tier, isBirthday } = ctx;

  // Only T2+ and not birthday (birthday has its own balloon system)
  if (tier < 2 || isBirthday) return null;

  return <FloatingParticles holiday={holiday} />;
}

function FloatingParticles({ holiday }) {
  const count = holiday.tier >= 3 ? 20 : 15;
  const chars = PARTICLE_CHARS[holiday.particle] || PARTICLE_CHARS.sparkles;

  // Deterministic positions from useMemo (same pattern as bgBalloonData)
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const char = chars[i % chars.length];
      const left = (5 + (i * 7.3 + 2) % 90).toFixed(1);
      const duration = 18 + ((i * 13 + 7) % 15);
      const delay = i < 3 ? -(duration * 0.3 + i * 2) : (i - 3) * 1.8 + ((i * 11 + 3) % 7) * 0.6;
      const size = 12 + ((i * 17 + 5) % 10);
      const sway = 10 + ((i * 19 + 1) % 20);
      return { id: i, char, left: `${left}%`, duration: `${duration}s`, delay: `${delay}s`, size: `${size}px`, sway: `${sway}px` };
    });
  }, [count, chars]);

  return (
    <div className="holiday-particles-container" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="holiday-particle"
          style={{
            left: p.left,
            fontSize: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            '--sway': p.sway,
          }}
        >
          {p.char}
        </span>
      ))}
      <style>{`
        .holiday-particles-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .holiday-particle {
          position: absolute;
          bottom: -40px;
          opacity: 0;
          animation: holidayFloat linear infinite;
          will-change: transform, opacity;
          user-select: none;
        }
        @keyframes holidayFloat {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          5% { opacity: 0.6; }
          50% {
            transform: translateY(-50vh) translateX(var(--sway, 15px)) rotate(180deg);
            opacity: 0.4;
          }
          95% { opacity: 0; }
          100% {
            transform: translateY(-110vh) translateX(calc(var(--sway, 15px) * -1)) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
