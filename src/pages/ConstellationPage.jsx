import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, Component } from 'react';
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
import PortalVFX from '../components/PortalVFX';
import { navigateWithTransition } from '../utils/viewTransitions';
import './ConstellationPage.css';

const ConstellationEditor = lazy(() => import('../constellation/ConstellationEditor'));

/** Type colors for DOM hover label */
const HOVER_TYPE_COLORS = {
  milestone: '#FFD700', person: '#4FC3F7', moment: '#AB47BC',
  idea: '#66BB6A', project: '#FF7043', place: '#26C6DA', track: '#34d399',
};

/**
 * DOM-based hover tooltip — fallback when 3D HoverLabel can't render
 * (WebGL context lost/degraded). Always renders in the DOM regardless of
 * WebGL state. The 3D HoverLabel in the Canvas renders on top when healthy,
 * so this acts as a seamless fallback.
 */
function DomHoverLabel() {
  const hoveredNodeId = useConstellationStore((s) => s.hoveredNodeId);
  const hoveredScreenPos = useConstellationStore((s) => s.hoveredScreenPos);
  const nodes = useConstellationStore((s) => s.nodes);

  if (!hoveredNodeId || !nodes || !hoveredScreenPos) {
    return null;
  }

  const node = nodes.find((n) => n.id === hoveredNodeId);
  if (!node) return null;
  const typeColor = HOVER_TYPE_COLORS[node.type] || '#aaa';

  return (
    <div
      className="constellation-hover-label"
      style={{
        left: hoveredScreenPos.x,
        top: hoveredScreenPos.y - 12,
      }}
    >
      <div className="constellation-hover-label__title">{node.title}</div>
      <div className="constellation-hover-label__meta">
        <span style={{ color: typeColor }}>{node.type}</span>
        {node.date && (
          <span className="constellation-hover-label__date">
            {new Date(node.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

/** Error boundary to catch R3F Canvas crashes gracefully */
class CanvasErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) {
    console.error('🔴 CanvasErrorBoundary caught:', err.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="constellation-loading constellation-loading--error">
          <div className="constellation-loading__card">
            <span className="constellation-loading__eyebrow">Render fault</span>
            <h2 className="constellation-loading__title">3D scene failed to load.</h2>
            <p className="constellation-loading__status">
              The starfield is still alive, but the scene needs a fresh render pass.
            </p>
            <button onClick={() => this.setState({ hasError: false })} className="constellation-loading__retry">
              Retry scene
            </button>
          </div>
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

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

function ConstellationLoadingOverlay({
  canvasReady,
  dataLoaded,
  dataError,
  introActive,
  loadingProgress,
  nodeCount,
  onRetry,
}) {
  if (dataError) {
    return (
      <div className="constellation-loading constellation-loading--error">
        <div className="constellation-loading__card">
          <span className="constellation-loading__eyebrow">Data fault</span>
          <h2 className="constellation-loading__title">Constellation data failed to load.</h2>
          <p className="constellation-loading__status">
            The scene shell is ready, but the memories and threads did not arrive.
          </p>
          <button className="constellation-loading__retry" onClick={onRetry}>
            Retry load
          </button>
        </div>
      </div>
    );
  }

  const stageCopy = introActive
    ? 'Opening the archive'
    : !canvasReady
      ? 'Stabilizing the viewport'
      : loadingProgress < 0.34
        ? 'Indexing memories'
        : loadingProgress < 0.7
          ? 'Tracing the threads'
          : 'Composing the helix';

  const statusCopy = dataLoaded
    ? `${nodeCount} memories aligned`
    : `${Math.round(loadingProgress * 100)}%`;

  return (
    <div className={`constellation-loading${introActive ? ' constellation-loading--settling' : ''}`}>
      <div className="constellation-loading__card">
        <span className="constellation-loading__eyebrow">The Constellation</span>
        <div
          className="constellation-loading__ring"
          style={{ '--progress': `${Math.round(loadingProgress * 360)}deg` }}
        />
        <h2 className="constellation-loading__title">{stageCopy}</h2>
        <p className="constellation-loading__status">{statusCopy}</p>
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
  const nodeCount = useConstellationStore((s) => s.nodes.length);
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const [canvasReady, setCanvasReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0.08);
  const navigate = useNavigate();
  const { nodeId: urlNodeId } = useParams();
  const prefersReducedMotion = usePrefersReducedMotion();
  const introPlayedThisSession = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('constellation-intro-played') === 'true';
  }, []);

  // Refs for back-button history state management
  const hasConstellationState = useRef(false);

  // ── Editor mode: ?editor=constellation or Ctrl+Shift+E toggle ──
  const showEditor = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('editor') === 'constellation';
  }, []);

  const [editorActive, setEditorActive] = useState(showEditor);
  const [editorGui, setEditorGui] = useState(null);

  // Ctrl+Shift+E toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setEditorActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Create / destroy lil-gui when editor becomes active
  useEffect(() => {
    if (!editorActive) {
      // Tear down
      setEditorGui(null);
      return;
    }

    let cancelled = false;
    let containerEl = null;
    let guiInstance = null;

    // Create container div for the editor panel
    containerEl = document.createElement('div');
    containerEl.className = 'constellation-editor-panels';
    document.body.appendChild(containerEl);

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .constellation-editor-panels {
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 10000;
        max-height: calc(100vh - 20px);
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(100,180,255,0.35) transparent;
      }
      .constellation-editor-panels::-webkit-scrollbar { width: 6px; }
      .constellation-editor-panels::-webkit-scrollbar-track { background: transparent; }
      .constellation-editor-panels::-webkit-scrollbar-thumb { background: rgba(100,180,255,0.35); border-radius: 4px; }
      .constellation-editor-panels::-webkit-scrollbar-thumb:hover { background: rgba(100,180,255,0.6); }

      /* lil-gui theme — constellation blue/purple */
      .constellation-editor-panels .lil-gui {
        --background-color: rgba(8,12,28,0.92);
        --title-background-color: rgba(30,50,120,0.55);
        --title-text-color: #a8c8ff;
        --text-color: #c0d0e8;
        --widget-color: rgba(40,60,140,0.35);
        --hover-color: rgba(50,80,180,0.45);
        --focus-color: rgba(60,100,200,0.55);
        --number-color: #7cb3ff;
        --string-color: #9be0c8;
        --font-size: 11px;
        --row-height: 26px;
        --padding: 8px;
        --name-width: 46%;
        --scrollbar-width: 5px;
      }
      .constellation-editor-panels .lil-gui { font-family: 'Inter','Segoe UI',system-ui,sans-serif; }
      .constellation-editor-panels .lil-gui .title {
        font-weight: 600; letter-spacing: 0.3px;
        border-bottom: 1px solid rgba(100,140,255,0.15);
      }
      .constellation-editor-panels > .lil-gui > .title {
        background: linear-gradient(135deg, rgba(30,60,160,0.6), rgba(20,30,100,0.6));
        font-size: 13px; letter-spacing: 0.6px; text-transform: uppercase;
      }
      .constellation-editor-panels .lil-gui .slider .fill { background: linear-gradient(90deg,#3a7aed,#7ab3fa); }
      .constellation-editor-panels .lil-gui .controller.function .widget {
        background: rgba(40,70,200,0.25); border: 1px solid rgba(100,140,255,0.2);
        border-radius: 3px; transition: background 0.15s, border-color 0.15s;
      }
      .constellation-editor-panels .lil-gui .controller.function .widget:hover {
        background: rgba(50,80,220,0.4); border-color: rgba(100,140,255,0.45);
      }
      .constellation-editor-panels .lil-gui input[type="checkbox"] { accent-color: #3a7aed; }
      .constellation-editor-panels .lil-gui select { background: rgba(20,35,80,0.7); border-color: rgba(100,140,255,0.2); }
      .constellation-editor-panels .lil-gui .controller.color .display { border-radius: 3px; border: 1px solid rgba(100,140,255,0.2); }
      .constellation-editor-panels .lil-gui .children::-webkit-scrollbar { width: 4px; }
      .constellation-editor-panels .lil-gui .children::-webkit-scrollbar-track { background: transparent; }
      .constellation-editor-panels .lil-gui .children::-webkit-scrollbar-thumb { background: rgba(100,140,255,0.25); border-radius: 3px; }
    `;
    document.head.appendChild(styleEl);

    import('lil-gui').then(({ default: GUI }) => {
      if (cancelled) { containerEl.remove(); styleEl.remove(); return; }

      guiInstance = new GUI({ container: containerEl, title: 'Constellation Editor', width: 320 });
      setEditorGui(guiInstance);
    });

    return () => {
      cancelled = true;
      if (guiInstance) {
        try { guiInstance.destroy(); } catch { /* already gone */ }
      }
      if (containerEl && containerEl.parentNode) containerEl.remove();
      if (styleEl && styleEl.parentNode) styleEl.remove();
      setEditorGui(null);
    };
  }, [editorActive]);

  // Load constellation data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Intro plays on every visit. Only skip for deep-links (camera flies
  // to the specific node instead) and reduced-motion preference.
  const skipIntro = Boolean(urlNodeId) || prefersReducedMotion;

  useEffect(() => {
    if (skipIntro) {
      setIntroComplete(true);
    }
  }, [skipIntro]);

  useEffect(() => {
    if (!dataLoaded) return;
    if (!skipIntro) return;
    setIntroComplete(true);
  }, [dataLoaded, skipIntro]);

  // Deep-link: auto-focus node from URL param once data is loaded.
  // Fires quickly so the camera fly-to animation plays as the scene
  // appears — user sees the cinematic swoop into the node.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (urlNodeId && dataLoaded && !deepLinked.current) {
      deepLinked.current = true;
      const focusNode = useConstellationStore.getState().focusNode;
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
    const handlePopState = () => {
      const state = useConstellationStore.getState();

      // Layer 1: If lightbox open -> close lightbox
      if (state.lightboxMedia !== null) {
        state.closeLightbox();
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
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (dataError) return undefined;

    const id = window.setInterval(() => {
      setLoadingProgress((prev) => {
        const target = dataLoaded ? 1 : canvasReady ? 0.8 : 0.28;
        const next = prev + (target - prev) * (dataLoaded ? 0.3 : 0.12);
        return Math.min(target, next);
      });
    }, 80);

    return () => window.clearInterval(id);
  }, [canvasReady, dataError, dataLoaded]);

  const handleRetry = useCallback(() => {
    setLoadingProgress(0.08);
    setIntroComplete(skipIntro);
    loadData({ force: true });
  }, [loadData, skipIntro]);
  const handleIntroComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('constellation-intro-played', 'true');
    }
    setIntroComplete(true);
  }, []);

  // ── Portal transition ──
  const [portalPhase, setPortalPhase] = useState(null);
  const [portalOrigin, setPortalOrigin] = useState({ x: '50%', y: '50%' });
  const portalTimersRef = useRef([]);

  const handlePortalEnter = useCallback((nodeId, sceneId) => {
    // Compute origin from the focused node's approximate screen position.
    // The node is shifted left by the frustum offset, so aim for the left-third
    // of the viewport as a reasonable estimate.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 768;
    const originX = isMobile ? '50%' : '33%';
    const originY = isMobile ? '35%' : '45%';
    setPortalOrigin({ x: originX, y: originY });

    // Store return path so CapsuleShell can navigate back here
    sessionStorage.setItem('jarowe_portal_entry', '1');
    sessionStorage.setItem('jarowe_portal_return', `/constellation/${nodeId}`);

    const cfg = window.__prismConfig || {};
    const gatherMs = cfg.portalGatherMs ?? 500;
    const eT = (fn, ms) => {
      const id = setTimeout(fn, ms);
      portalTimersRef.current.push(id);
    };

    setPortalPhase('seep');
    eT(() => setPortalPhase('gathering'), 300);
    eT(() => {
      setPortalPhase('rupture');
      navigateWithTransition(navigate, `/memory/${sceneId}`);
    }, 300 + gatherMs);
    eT(() => setPortalPhase('emerging'), 300 + gatherMs + (cfg.portalRuptureMs ?? 500));
    eT(() => setPortalPhase('residual'), 300 + gatherMs + (cfg.portalRuptureMs ?? 500) + (cfg.portalEmergeMs ?? 900));
    eT(() => setPortalPhase(null), 300 + gatherMs + (cfg.portalRuptureMs ?? 500) + (cfg.portalEmergeMs ?? 900) + (cfg.portalResidualMs ?? 1800));
  }, [navigate]);

  // Cleanup portal timers on unmount
  useEffect(() => () => {
    portalTimersRef.current.forEach(clearTimeout);
  }, []);

  // Intro fires when: 3D mode, data ready, canvas ready, not skipped, not yet complete.
  // The preload may cause dataLoaded to be true before canvasReady — that's fine,
  // the intro just waits for both conditions before starting.
  const introExpected = viewMode === '3d'
    && !dataError
    && !skipIntro
    && !introComplete;

  const introActive = introExpected
    && dataLoaded
    && canvasReady
    && !dataError;

  const sceneUiVisible = viewMode === '3d' && dataLoaded && !dataError && !introActive;
  const show3DOverlay = viewMode === '3d' && (!canvasReady || !dataLoaded || introActive || Boolean(dataError));

  if (viewMode !== '3d') {
    if (!dataLoaded && dataLoading) {
      return (
        <div className="constellation-page">
          <ConstellationLoadingOverlay
            canvasReady={canvasReady}
            dataLoaded={false}
            dataError={null}
            introActive={false}
            loadingProgress={loadingProgress}
            nodeCount={nodeCount}
            onRetry={handleRetry}
          />
        </div>
      );
    }

    if (!dataLoaded && dataError) {
      return (
        <div className="constellation-page">
          <ConstellationLoadingOverlay
            canvasReady={canvasReady}
            dataLoaded={false}
            dataError={dataError}
            introActive={false}
            loadingProgress={loadingProgress}
            nodeCount={nodeCount}
            onRetry={handleRetry}
          />
        </div>
      );
    }
  }

  return (
    <div className="constellation-page">
      {viewMode === '3d' ? (
        <>
          {canvasReady && (
            <CanvasErrorBoundary>
              <ConstellationCanvas
                introEnabled={introActive}
                introExpected={introExpected}
                onIntroComplete={handleIntroComplete}
                reducedMotion={prefersReducedMotion}
              />
            </CanvasErrorBoundary>
          )}
          {show3DOverlay && (
            <ConstellationLoadingOverlay
              canvasReady={canvasReady}
              dataLoaded={dataLoaded}
              dataError={dataError}
              introActive={introActive}
              loadingProgress={loadingProgress}
              nodeCount={nodeCount}
              onRetry={handleRetry}
            />
          )}
          <div className={`constellation-scene-ui${sceneUiVisible ? ' constellation-scene-ui--visible' : ''}`}>
            <ViewToggle />
            <Toolbar />
            <TimelineScrubber />
            <ThemeLegend />
            <DomHoverLabel />
            <StoryPanel onPortalEnter={handlePortalEnter} />
            <MediaLightbox />
            <AutoDetectPrompt />
          </div>
          {portalPhase && (
            <PortalVFX
              phase={portalPhase}
              originX={portalOrigin.x}
              originY={portalOrigin.y}
            />
          )}
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

      {/* Editor panel — activated via ?editor=constellation or Ctrl+Shift+E */}
      {editorGui && (
        <Suspense fallback={null}>
          <ConstellationEditor parentGui={editorGui} />
        </Suspense>
      )}
    </div>
  );
}
