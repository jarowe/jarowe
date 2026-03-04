import { useMemo } from 'react';

export default function SnowBackground() {
  const flakes = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => {
      const isGust = i % 8 === 0;
      return {
        id: i,
        left: `${(i * 1.67 + ((i * 7) % 5)) % 100}%`,
        size: `${4 + ((i * 13 + 3) % 8)}px`,
        duration: `${8 + ((i * 11 + 7) % 12)}s`,
        delay: i < 12 ? `${-((i * 1.2) + 2)}s` : `${(i - 12) * 0.45}s`,
        drift: isGust
          ? `${40 + ((i * 13) % 21)}px`
          : `${-20 + ((i * 17 + 1) % 40)}px`,
        opacity: 0.3 + ((i * 7 + 2) % 7) / 10,
      };
    }),
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
      <div className="snow-accumulation" />
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
        .snow-accumulation {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 60px;
          background: linear-gradient(to top, rgba(255,255,255,0.04), transparent);
          pointer-events: none;
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
