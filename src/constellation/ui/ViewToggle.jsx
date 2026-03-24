import { useConstellationStore } from '../store';
import './ViewToggle.css';

/**
 * Toggle between helix (side) view and tunnel (inside) view.
 */
export default function ViewToggle() {
  const cameraMode = useConstellationStore((s) => s.cameraMode);
  const setCameraMode = useConstellationStore((s) => s.setCameraMode);

  const handleToggle = () => {
    setCameraMode(cameraMode === 'helix' ? 'tunnel' : 'helix');
  };

  const isTunnel = cameraMode === 'tunnel';

  return (
    <button
      className={`view-toggle${isTunnel ? ' view-toggle--active' : ''}`}
      onClick={handleToggle}
      title={isTunnel ? 'Switch to side view' : 'Switch to tunnel view'}
      aria-label={isTunnel ? 'Switch to side view' : 'Switch to tunnel view'}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isTunnel ? (
          /* DNA helix icon — side view */
          <>
            <path d="M6 3c0 4.5 6 7.5 6 12s-6 7.5-6 12" opacity="0.5" />
            <path d="M18 3c0 4.5-6 7.5-6 12s6 7.5 6 12" opacity="0.5" />
            <line x1="7" y1="7" x2="17" y2="7" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="17" x2="17" y2="17" />
          </>
        ) : (
          /* Tunnel icon — converging lines into center */
          <>
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" opacity="0.4" />
            <line x1="4" y1="4" x2="9" y2="9" />
            <line x1="20" y1="4" x2="15" y2="9" />
            <line x1="4" y1="20" x2="9" y2="15" />
            <line x1="20" y1="20" x2="15" y2="15" />
          </>
        )}
      </svg>
    </button>
  );
}
