import { useEffect, useRef } from 'react';

export default function FogBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const xPct = ((e.clientX / window.innerWidth) - 0.5) * 10;
      const yPct = ((e.clientY / window.innerHeight) - 0.5) * 10;
      el.style.setProperty('--fog-x', `${xPct}%`);
      el.style.setProperty('--fog-y', `${yPct}%`);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="holiday-bg-fog"
      aria-hidden="true"
      style={{ '--fog-x': '0%', '--fog-y': '0%' }}
    >
      <div className="fog-layer fog-layer-1" />
      <div className="fog-layer fog-layer-2" />
      <div className="fog-layer fog-layer-3" />
      <style>{`
        .holiday-bg-fog {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .fog-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          animation: fogPulse 8s ease-in-out infinite;
        }
        .fog-layer-1 {
          background: radial-gradient(ellipse at calc(20% + var(--fog-x)) calc(80% + var(--fog-y)), rgba(34, 197, 94, 0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at calc(80% + var(--fog-x)) calc(30% + var(--fog-y)), rgba(249, 115, 22, 0.06) 0%, transparent 50%);
          animation-delay: 0s;
        }
        .fog-layer-2 {
          background: radial-gradient(ellipse at calc(60% + var(--fog-x)) calc(70% + var(--fog-y)), rgba(249, 115, 22, 0.07) 0%, transparent 55%),
                      radial-gradient(ellipse at calc(30% + var(--fog-x)) calc(20% + var(--fog-y)), rgba(34, 197, 94, 0.05) 0%, transparent 50%);
          animation-delay: 4s;
        }
        .fog-layer-3 {
          background: radial-gradient(ellipse at calc(45% + var(--fog-x)) calc(50% + var(--fog-y)), rgba(34, 197, 94, 0.06) 0%, transparent 65%),
                      radial-gradient(ellipse at calc(70% + var(--fog-x)) calc(60% + var(--fog-y)), rgba(249, 115, 22, 0.05) 0%, transparent 45%);
          animation-delay: 2.5s;
        }
        @keyframes fogPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
