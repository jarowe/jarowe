export default function FogBackground() {
  return (
    <div className="holiday-bg-fog" aria-hidden="true">
      <div className="fog-layer fog-layer-1" />
      <div className="fog-layer fog-layer-2" />
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
          background: radial-gradient(ellipse at 20% 80%, rgba(34, 197, 94, 0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 30%, rgba(249, 115, 22, 0.06) 0%, transparent 50%);
          animation-delay: 0s;
        }
        .fog-layer-2 {
          background: radial-gradient(ellipse at 60% 70%, rgba(249, 115, 22, 0.07) 0%, transparent 55%),
                      radial-gradient(ellipse at 30% 20%, rgba(34, 197, 94, 0.05) 0%, transparent 50%);
          animation-delay: 4s;
        }
        @keyframes fogPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
