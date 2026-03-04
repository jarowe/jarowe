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

// Map particle type → CSS animation class suffix
const CATEGORY_ANIM = {
  notes:    'music',
  stars:    'space',
  warp:     'space',
  sparkles: 'default',
  hearts:   'default',
  leaves:   'nature',
  circuits: 'default',
  compass:  'default',
  confetti: 'humor',
  film:     'default',
  ghosts:   'spooky',
  snow:     'winter',
  balloons: 'default',
};

export default function HolidayParticles() {
  const ctx = useHoliday();
  if (!ctx) return null;

  const { holiday, tier, isBirthday } = ctx;

  // Birthday has its own balloon system
  if (isBirthday) return null;

  // T1 gets ultra-subtle particles, T2+ gets more
  if (tier < 1) return null;

  return <FloatingParticles holiday={holiday} tier={tier} />;
}

function FloatingParticles({ holiday, tier }) {
  const count = tier >= 3 ? 30 : tier >= 2 ? 20 : 5;
  const particleType = holiday.particle || 'sparkles';
  const chars = PARTICLE_CHARS[particleType] || PARTICLE_CHARS.sparkles;
  const animType = CATEGORY_ANIM[particleType] || 'default';

  // T3 mount-burst: 10 extra particles that appear once
  const burstCount = tier >= 3 ? 10 : 0;

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const char = chars[i % chars.length];
      const left = (5 + (i * 7.3 + 2) % 90).toFixed(1);
      // T1: very slow/subtle. T2: moderate. T3: full
      const baseDuration = tier === 1 ? 25 + ((i * 13 + 7) % 10) : 18 + ((i * 13 + 7) % 15);
      const delay = i < 3 ? -(baseDuration * 0.3 + i * 2) : (i - 3) * 1.8 + ((i * 11 + 3) % 7) * 0.6;
      const size = tier === 1 ? 8 + ((i * 17 + 5) % 3) : 12 + ((i * 17 + 5) % 10);
      const sway = 10 + ((i * 19 + 1) % 20);
      // T1: very low opacity
      const opacity = tier === 1 ? 0.12 : tier === 2 ? 0.5 : 0.6;
      // A few particles render in front of content for depth layering
      const isFront = i % 8 === 0 && tier >= 2;
      return { id: i, char, left: `${left}%`, duration: `${baseDuration}s`, delay: `${delay}s`, size: `${size}px`, sway: `${sway}px`, opacity, isFront };
    });
  }, [count, chars, tier]);

  // Burst particles (T3 only) - quick fade-in fade-out, appear once
  const burstParticles = useMemo(() => {
    if (burstCount === 0) return [];
    return Array.from({ length: burstCount }, (_, i) => {
      const char = chars[i % chars.length];
      const left = (10 + (i * 9.1 + 3) % 80).toFixed(1);
      const top = (20 + (i * 11.3 + 5) % 60).toFixed(1);
      const size = 14 + ((i * 13 + 7) % 8);
      return { id: `burst-${i}`, char, left: `${left}%`, top: `${top}%`, size: `${size}px` };
    });
  }, [burstCount, chars]);

  return (
    <div className="holiday-particles-container" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`holiday-particle holiday-particle-${animType}`}
          style={{
            left: p.left,
            fontSize: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            '--sway': p.sway,
            '--p-opacity': p.opacity,
            zIndex: p.isFront ? 9998 : 0,
          }}
        >
          {p.char}
        </span>
      ))}
      {burstParticles.map((p) => (
        <span
          key={p.id}
          className="holiday-particle holiday-particle-burst"
          style={{
            left: p.left,
            top: p.top,
            fontSize: p.size,
            bottom: 'auto',
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
          will-change: transform, opacity;
          user-select: none;
        }

        /* ── Default: float up ── */
        .holiday-particle-default {
          animation: hpFloatUp linear infinite;
        }
        @keyframes hpFloatUp {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          5% { opacity: var(--p-opacity, 0.5); }
          50% { transform: translateY(-50vh) translateX(var(--sway, 15px)) rotate(180deg); opacity: calc(var(--p-opacity, 0.5) * 0.7); }
          95% { opacity: 0; }
          100% { transform: translateY(-110vh) translateX(calc(var(--sway, 15px) * -1)) rotate(360deg); opacity: 0; }
        }

        /* ── Music: bouncy sine-wave, pulse in size ── */
        .holiday-particle-music {
          animation: hpMusic linear infinite;
        }
        @keyframes hpMusic {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          5% { opacity: var(--p-opacity, 0.5); }
          25% { transform: translateY(-25vh) translateX(var(--sway, 15px)) scale(1.3); }
          50% { transform: translateY(-50vh) translateX(calc(var(--sway, 15px) * -0.5)) scale(0.8); opacity: calc(var(--p-opacity, 0.5) * 0.8); }
          75% { transform: translateY(-75vh) translateX(var(--sway, 15px)) scale(1.2); }
          95% { opacity: 0; }
          100% { transform: translateY(-110vh) translateX(0) scale(1); opacity: 0; }
        }

        /* ── Space/Scifi: drift outward, twinkling ── */
        .holiday-particle-space {
          animation: hpSpace linear infinite;
        }
        @keyframes hpSpace {
          0% { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; }
          5% { opacity: var(--p-opacity, 0.5); }
          20% { opacity: calc(var(--p-opacity, 0.5) * 0.3); }
          35% { opacity: var(--p-opacity, 0.5); transform: translateY(-35vh) translateX(var(--sway, 15px)) scale(0.8); }
          50% { opacity: calc(var(--p-opacity, 0.5) * 0.2); }
          65% { opacity: var(--p-opacity, 0.5); transform: translateY(-65vh) translateX(calc(var(--sway, 15px) * -1)) scale(1.1); }
          80% { opacity: calc(var(--p-opacity, 0.5) * 0.4); }
          95% { opacity: 0; }
          100% { transform: translateY(-110vh) translateX(var(--sway, 15px)) scale(0.6); opacity: 0; }
        }

        /* ── Spooky: erratic jerky motion ── */
        .holiday-particle-spooky {
          animation: hpSpooky linear infinite;
        }
        @keyframes hpSpooky {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          3% { opacity: var(--p-opacity, 0.5); }
          10% { transform: translate(calc(var(--sway, 15px) * 2), -10vh) rotate(-30deg); }
          20% { transform: translate(calc(var(--sway, 15px) * -1.5), -22vh) rotate(45deg); }
          30% { transform: translate(var(--sway, 15px), -30vh) rotate(-20deg); opacity: var(--p-opacity, 0.5); }
          45% { transform: translate(calc(var(--sway, 15px) * -2), -45vh) rotate(60deg); opacity: calc(var(--p-opacity, 0.5) * 0.5); }
          55% { transform: translate(calc(var(--sway, 15px) * 1.5), -55vh) rotate(-45deg); opacity: var(--p-opacity, 0.5); }
          70% { transform: translate(calc(var(--sway, 15px) * -1), -70vh) rotate(30deg); }
          85% { transform: translate(var(--sway, 15px), -85vh) rotate(-60deg); opacity: calc(var(--p-opacity, 0.5) * 0.3); }
          95% { opacity: 0; }
          100% { transform: translate(0, -110vh) rotate(90deg); opacity: 0; }
        }

        /* ── Nature: wind-blown horizontal drift with tumble ── */
        .holiday-particle-nature {
          animation: hpNature linear infinite;
        }
        @keyframes hpNature {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          5% { opacity: var(--p-opacity, 0.5); }
          25% { transform: translateY(-20vh) translateX(calc(var(--sway, 15px) * 2)) rotate(90deg); }
          50% { transform: translateY(-45vh) translateX(calc(var(--sway, 15px) * -1)) rotate(200deg); opacity: calc(var(--p-opacity, 0.5) * 0.7); }
          75% { transform: translateY(-70vh) translateX(calc(var(--sway, 15px) * 2.5)) rotate(310deg); }
          95% { opacity: 0; }
          100% { transform: translateY(-110vh) translateX(calc(var(--sway, 15px) * -0.5)) rotate(400deg); opacity: 0; }
        }

        /* ── Humor: zigzag bounce ── */
        .holiday-particle-humor {
          animation: hpHumor linear infinite;
        }
        @keyframes hpHumor {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          5% { opacity: var(--p-opacity, 0.5); }
          15% { transform: translateY(-15vh) translateX(calc(var(--sway, 15px) * 2)) scale(1.2); }
          30% { transform: translateY(-28vh) translateX(calc(var(--sway, 15px) * -2)) scale(0.9); }
          45% { transform: translateY(-42vh) translateX(calc(var(--sway, 15px) * 1.5)) scale(1.15); }
          60% { transform: translateY(-58vh) translateX(calc(var(--sway, 15px) * -1.5)) scale(0.85); opacity: calc(var(--p-opacity, 0.5) * 0.6); }
          75% { transform: translateY(-72vh) translateX(calc(var(--sway, 15px) * 2)) scale(1.1); }
          90% { transform: translateY(-90vh) translateX(calc(var(--sway, 15px) * -1)) scale(0.95); }
          95% { opacity: 0; }
          100% { transform: translateY(-110vh) translateX(0) scale(1); opacity: 0; }
        }

        /* ── Winter: slow gentle drift down (snowfall feel) ── */
        .holiday-particle-winter {
          bottom: auto;
          top: -40px;
          animation: hpWinter linear infinite;
        }
        @keyframes hpWinter {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          5% { opacity: var(--p-opacity, 0.5); }
          50% { transform: translateY(50vh) translateX(var(--sway, 10px)) rotate(180deg); opacity: calc(var(--p-opacity, 0.5) * 0.8); }
          95% { opacity: 0; }
          100% { transform: translateY(110vh) translateX(calc(var(--sway, 10px) * -0.5)) rotate(360deg); opacity: 0; }
        }

        /* ── Burst particles (T3 mount effect) ── */
        .holiday-particle-burst {
          bottom: auto;
          animation: hpBurst 2s ease-out forwards;
        }
        @keyframes hpBurst {
          0% { transform: scale(0); opacity: 0; }
          20% { transform: scale(1.4); opacity: 0.8; }
          60% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(0.5) translateY(-30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
