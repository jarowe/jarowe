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
          /* Helix/orbit icon — concentric ellipse */
          <>
            <ellipse cx="12" cy="12" rx="10" ry="4" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </>
        ) : (
          /* Tunnel icon — converging lines */
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
