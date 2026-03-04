import { useMemo } from 'react';

export default function SnowBackground() {
  const flakes = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${(i * 2.5 + ((i * 7) % 5)) % 100}%`,
      size: `${4 + ((i * 13 + 3) % 8)}px`,
      duration: `${8 + ((i * 11 + 7) % 12)}s`,
      delay: i < 8 ? `${-((i * 1.5) + 2)}s` : `${(i - 8) * 0.6}s`,
      drift: `${-20 + ((i * 17 + 1) % 40)}px`,
      opacity: 0.3 + ((i * 7 + 2) % 7) / 10,
    })),
  []);

  return (
    <div className="holiday-bg-snow" aria-hidden="true">
      {flakes.map((f) => (
        <div
          key={f.id}
          className="snowflake"
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            animationDuration: f.duration,
            animationDelay: f.delay,
            '--drift': f.drift,
            opacity: f.opacity,
          }}
        />
      ))}
      <style>{`
        .holiday-bg-snow {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .snowflake {
          position: absolute;
          top: -10px;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.1) 70%);
          border-radius: 50%;
          animation: snowFall linear infinite;
          will-change: transform;
        }
        @keyframes snowFall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          50% {
            transform: translateY(50vh) translateX(var(--drift, 10px)) rotate(180deg);
          }
          100% {
            transform: translateY(105vh) translateX(calc(var(--drift, 10px) * -0.5)) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
