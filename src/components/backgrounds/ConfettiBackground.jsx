import { useMemo } from 'react';

const COLORS = ['#eab308','#ec4899','#7c3aed','#38bdf8','#22c55e','#f43f5e'];

export default function ConfettiBackground() {
  const pieces = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${(i * 2.0 + ((i * 13) % 7)) % 100}%`,
      width: `${6 + ((i * 11 + 3) % 6)}px`,
      height: `${8 + ((i * 7 + 5) % 10)}px`,
      color: COLORS[i % COLORS.length],
      duration: `${10 + ((i * 9 + 2) % 11)}s`,
      delay: i < 10 ? `${-((i * 1.8) + 1)}s` : `${(i - 10) * 0.5}s`,
      sway: `${-30 + ((i * 19 + 3) % 60)}px`,
      opacity: 0.4 + ((i * 11 + 1) % 5) / 12.5,
    })),
  []);

  return (
    <div className="holiday-bg-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            background: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
            '--sway': p.sway,
            opacity: p.opacity,
          }}
        />
      ))}
      <style>{`
        .holiday-bg-confetti {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          top: -10px;
          border-radius: 2px;
          animation: confettiRain linear infinite;
          will-change: transform;
        }
        @keyframes confettiRain {
          0% {
            transform: translateY(-10px) translateX(0) rotate(0deg);
          }
          25% {
            transform: translateY(27vh) translateX(var(--sway, 15px)) rotate(180deg);
          }
          50% {
            transform: translateY(55vh) translateX(calc(var(--sway, 15px) * -0.6)) rotate(360deg);
          }
          75% {
            transform: translateY(82vh) translateX(calc(var(--sway, 15px) * 0.4)) rotate(540deg);
          }
          100% {
            transform: translateY(110vh) translateX(calc(var(--sway, 15px) * -0.3)) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
}
