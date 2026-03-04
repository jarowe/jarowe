import { useMemo } from 'react';

function makeStars(count, offset) {
  return Array.from({ length: count }, (_, i) => {
    const idx = i + offset;
    return {
      id: idx,
      left: `${(idx * 1.7 + ((idx * 23) % 13)) % 100}%`,
      top: `${(idx * 2.3 + ((idx * 17) % 11)) % 100}%`,
    };
  });
}

export default function StarsBackground() {
  const backStars = useMemo(() => makeStars(80, 0), []);
  const midStars = useMemo(() => makeStars(40, 100), []);
  const frontStars = useMemo(() => makeStars(15, 200), []);

  return (
    <div className="holiday-bg-stars" aria-hidden="true">
      {/* Layer 1 — back: tiny, slow, dim */}
      {backStars.map((s) => (
        <div
          key={s.id}
          className="star star-back"
          style={{
            left: s.left,
            top: s.top,
            width: `${1 + ((s.id * 7 + 1) % 2)}px`,
            height: `${1 + ((s.id * 7 + 1) % 2)}px`,
            opacity: 0.3 + ((s.id * 11 + 3) % 4) / 13.3,
            animationDelay: `${(s.id * 0.37) % 5}s`,
            '--twinkle-dur': `${2 + ((s.id * 13 + 2) % 4)}s`,
            '--drift': `${-8 + ((s.id * 19) % 16)}px`,
          }}
        />
      ))}
      {/* Layer 2 — mid: medium, moderate speed */}
      {midStars.map((s) => (
        <div
          key={s.id}
          className="star star-mid"
          style={{
            left: s.left,
            top: s.top,
            width: `${2 + ((s.id * 11 + 2) % 2)}px`,
            height: `${2 + ((s.id * 11 + 2) % 2)}px`,
            opacity: 0.4 + ((s.id * 9 + 1) % 4) / 13.3,
            animationDelay: `${(s.id * 0.29) % 5}s`,
            '--twinkle-dur': `${2 + ((s.id * 7 + 5) % 4)}s`,
            '--drift': `${-14 + ((s.id * 23) % 28)}px`,
          }}
        />
      ))}
      {/* Layer 3 — front: bright, faster */}
      {frontStars.map((s) => (
        <div
          key={s.id}
          className="star star-front"
          style={{
            left: s.left,
            top: s.top,
            width: `${3 + ((s.id * 13 + 3) % 2)}px`,
            height: `${3 + ((s.id * 13 + 3) % 2)}px`,
            opacity: 0.6 + ((s.id * 7 + 2) % 4) / 13.3,
            animationDelay: `${(s.id * 0.43) % 5}s`,
            '--twinkle-dur': `${2 + ((s.id * 11 + 1) % 4)}s`,
            '--drift': `${-20 + ((s.id * 29) % 40)}px`,
          }}
        />
      ))}
      <style>{`
        .holiday-bg-stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
          background: transparent;
        }
        .star {
          position: absolute;
          border-radius: 50%;
          will-change: transform, opacity;
        }
        .star-back {
          background: rgba(255, 255, 255, 0.9);
          animation:
            starTwinkle var(--twinkle-dur, 3s) ease-in-out infinite,
            starDrift 60s linear infinite;
        }
        .star-mid {
          background: rgba(210, 225, 255, 0.95);
          animation:
            starTwinkle var(--twinkle-dur, 3s) ease-in-out infinite,
            starDrift 40s linear infinite;
        }
        .star-front {
          background: rgba(190, 210, 255, 1);
          box-shadow: 0 0 3px rgba(190, 210, 255, 0.5);
          animation:
            starTwinkle var(--twinkle-dur, 3s) ease-in-out infinite,
            starDrift 25s linear infinite;
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: inherit; }
          50% { opacity: 0.15; }
        }
        @keyframes starDrift {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(var(--drift, 10px));
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
