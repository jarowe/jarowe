import { useState, useEffect, useRef, useCallback, Component } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConstellationStore } from '../constellation/store';
import ConstellationCanvas from '../constellation/scene/ConstellationCanvas';
import ListView from '../constellation/fallback/ListView';
import Toolbar from '../constellation/ui/Toolbar';
import TimelineScrubber from '../constellation/ui/TimelineScrubber';
import DetailPanel from '../constellation/ui/DetailPanel';
import StoryPanel from '../constellation/ui/StoryPanel';
import MediaLightbox from '../constellation/ui/MediaLightbox';
import ThemeLegend from '../constellation/ui/ThemeLegend';
import ViewToggle from '../constellation/ui/ViewToggle';
import './ConstellationPage.css';

/** Error boundary to catch R3F Canvas crashes gracefully */
class CanvasErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('Constellation 3D error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="constellation-loading">
          <p>3D scene failed to load.</p>
          <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Auto-detect prompt for weak GPU devices.
 * Shown once for tier 0-1 devices if user hasn't dismissed it.
 */
function AutoDetectPrompt() {
  const gpuTier = useConstellationStore((s) => s.gpuTier);
  const setViewMode = useConstellationStore((s) => s.setViewMode);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show for tier 0-1 GPUs
    if (gpuTier === null || gpuTier > 1) return;

    // Only show once per device
    const dismissed = localStorage.getItem('constellation-autodetect-dismissed');
    if (dismissed) return;

    setVisible(true);
  }, [gpuTier]);

  if (!visible) return null;

  const handleSwitch = () => {
    setViewMode('2d');
    localStorage.setItem('constellation-autodetect-dismissed', 'true');
    setVisible(false);
  };

  const handleKeep = () => {
    localStorage.setItem('constellation-autodetect-dismissed', 'true');
    setVisible(false);
  };

  return (
    <div className="autodetect-prompt">
      <p className="autodetect-prompt__text">
        Your device may have trouble with 3D. Switch to List View?
      </p>
      <div className="autodetect-prompt__actions">
        <button
          className="autodetect-prompt__btn autodetect-prompt__btn--primary"
          onClick={handleSwitch}
        >
          Switch to List
        </button>
        <button
          className="autodetect-prompt__btn"
          onClick={handleKeep}
        >
          Keep 3D
        </button>
      </div>
    </div>
  );
}

export default function ConstellationPage() {
  const viewMode = useConstellationStore((s) => s.viewMode);
  const dataLoading = useConstellationStore((s) => s.dataLoading);
  const dataLoaded = useConstellationStore((s) => s.dataLoaded);
  const dataError = useConstellationStore((s) => s.dataError);
  const loadData = useConstellationStore((s) => s.loadData);
  const [canvasReady, setCanvasReady] = useState(false);
  const navigate = useNavigate();
  const { nodeId: urlNodeId } = useParams();

  // Refs for back-button history state management
  const hasConstellationState = useRef(false);

  // Load constellation data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep-link: auto-focus node from URL param once data is loaded
  const deepLinked = useRef(false);
  useEffect(() => {
    if (urlNodeId && dataLoaded && !deepLinked.current) {
      deepLinked.current = true;
      const focusNode = useConstellationStore.getState().focusNode;
      // Small delay to let canvas initialize
      requestAnimationFrame(() => focusNode(urlNodeId));
    }
  }, [urlNodeId, dataLoaded]);

  // Delay Canvas mount by one frame to survive React StrictMode's
  // mount-unmount-remount cycle. Without this, StrictMode creates and
  // destroys a WebGL context (with 18+ bloom textures) before the
  // real mount, causing THREE.WebGLRenderer: Context Lost.
  useEffect(() => {
    const id = requestAnimationFrame(() => setCanvasReady(true));
    return () => {
      cancelAnimationFrame(id);
      setCanvasReady(false);
    };
  }, []);

  // ---- Layered ESC key handler ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;

      const state = useConstellationStore.getState();

      // Layer 1: If lightbox open -> close lightbox (panel stays)
      if (state.lightboxMedia !== null) {
        e.preventDefault();
        state.closeLightbox();
        return;
      }

      // Layer 2: If detail panel open -> close panel
      if (state.focusedNodeId !== null) {
        e.preventDefault();
        state.clearFocus();
        return;
      }

      // Layer 2.5: If in tunnel mode -> return to helix
      if (state.cameraMode === 'tunnel') {
        e.preventDefault();
        state.setCameraMode('helix');
        return;
      }

      // Layer 3: Nothing open -> navigate away from constellation
      e.preventDefault();
      navigate(-1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // ---- Browser back button (popstate) handler ----
  // Push history state when a node is first focused
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);

  useEffect(() => {
    if (focusedNodeId && !hasConstellationState.current) {
      // First focus: push a history entry so back button can close panel
      window.history.pushState({ constellation: true }, '', `/constellation/${focusedNodeId}`);
      hasConstellationState.current = true;
    } else if (focusedNodeId && hasConstellationState.current) {
      // Subsequent focus: replace state with new node URL
      window.history.replaceState({ constellation: true }, '', `/constellation/${focusedNodeId}`);
    } else if (!focusedNodeId && hasConstellationState.current) {
      // Panel closed via clearFocus: go back to base URL
      window.history.replaceState({}, '', '/constellation');
      hasConstellationState.current = false;
    }
  }, [focusedNodeId]);

  useEffect(() => {
    const handlePopState = (e) => {
      const state = useConstellationStore.getState();

      // Layer 1: If lightbox open -> close lightbox
      if (state.lightboxMedia !== null) {
        state.closeLightbox();
        // Re-push state so back button still works for panel
        window.history.pushState({ constellation: true }, '');
        return;
      }

      // Layer 2: If panel open -> clear focus
      if (state.focusedNodeId !== null) {
        state.clearFocus();
        hasConstellationState.current = false;
        return;
      }

      // Layer 3: Navigate away (let browser handle default back)
      // Don't prevent -- the default popstate already navigated
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Gate on data loading state
  if (!dataLoaded && dataLoading) {
    return (
      <div className="constellation-page">
        <div className="constellation-loading">Initializing Constellation...</div>
      </div>
    );
  }

  if (!dataLoaded && dataError) {
    return (
      <div className="constellation-page">
        <div className="constellation-loading">
          <p>Failed to load constellation data.</p>
          <button
            onClick={() => loadData({ force: true })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="constellation-page">
      {viewMode === '3d' ? (
        <>
          {!canvasReady && (
            <div className="constellation-loading">
              Initializing Constellation...
            </div>
          )}
          {canvasReady && (
            <CanvasErrorBoundary>
              <ConstellationCanvas />
            </CanvasErrorBoundary>
          )}
          <ViewToggle />
          <Toolbar />
          <TimelineScrubber />
          <ThemeLegend />
          <StoryPanel />
          <MediaLightbox />
          <AutoDetectPrompt />
        </>
      ) : (
        <div className="constellation-2d-layout">
          <div className="constellation-2d-layout__toolbar">
            <Toolbar />
          </div>
          <div className="constellation-2d-layout__content">
            <ListView />
          </div>
          <DetailPanel />
          <MediaLightbox />
        </div>
      )}
    </div>
  );
}
