import { useMemo } from 'react';

const HEARTS = ['\u2764\uFE0F','\uD83D\uDC95','\uD83D\uDC96','\uD83D\uDC97','\uD83D\uDC9C','\uD83E\uDE77'];

export default function HeartsBackground() {
  const hearts = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${(i * 3.3 + ((i * 11) % 9)) % 100}%`,
      emoji: HEARTS[i % HEARTS.length],
      size: `${16 + ((i * 7 + 3) % 17)}px`,
      duration: `${15 + ((i * 13 + 1) % 16)}s`,
      delay: i < 6 ? `${-((i * 2.5) + 3)}s` : `${(i - 6) * 0.8}s`,
      sway: `${-25 + ((i * 17 + 5) % 50)}px`,
      opacity: 0.15 + ((i * 9 + 2) % 5) / 25,
    })),
  []);

  return (
    <div className="holiday-bg-hearts" aria-hidden="true">
      {hearts.map((h) => (
        <span
          key={h.id}
          className="heart-float"
          style={{
            left: h.left,
            fontSize: h.size,
            animationDuration: h.duration,
            animationDelay: h.delay,
            '--sway': h.sway,
            opacity: h.opacity,
          }}
        >
          {h.emoji}
        </span>
      ))}
      <style>{`
        .holiday-bg-hearts {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .heart-float {
          position: absolute;
          bottom: -30px;
          line-height: 1;
          animation: heartRise linear infinite;
          will-change: transform;
        }
        @keyframes heartRise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
          }
          25% {
            transform: translateY(-28vh) translateX(var(--sway, 10px)) scale(1.05);
          }
          50% {
            transform: translateY(-55vh) translateX(calc(var(--sway, 10px) * -0.7)) scale(0.95);
          }
          75% {
            transform: translateY(-82vh) translateX(calc(var(--sway, 10px) * 0.5)) scale(1.02);
          }
          100% {
            transform: translateY(-115vh) translateX(calc(var(--sway, 10px) * -0.3)) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
