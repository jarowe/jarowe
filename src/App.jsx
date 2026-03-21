import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Patcher from './pages/Patcher';
import BeamyProject from './pages/BeamyProject';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import StarseedProject from './pages/StarseedProject';

// Retry wrapper for lazy imports — handles stale chunks after deployments
function lazyRetry(importFn) {
  return React.lazy(() =>
    importFn().catch(() => {
      const key = 'jarowe_chunk_reload';
      const last = sessionStorage.getItem(key);
      if (!last || Date.now() - parseInt(last, 10) > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return new Promise(() => {}); // Never resolves — page is reloading
      }
      return importFn();
    })
  );
}

const UniversePage = lazyRetry(() => import('./pages/UniversePage'));
const ConstellationPage = lazyRetry(() => import('./pages/ConstellationPage'));
const AdminPage = lazyRetry(() => import('./pages/Admin'));
const AdminGames = lazyRetry(() => import('./pages/AdminGames'));
const AdminUsers = lazyRetry(() => import('./pages/AdminUsers'));
const AdminContent = lazyRetry(() => import('./pages/AdminContent'));
const AdminCampaigns = lazyRetry(() => import('./pages/AdminCampaigns'));
const AdminEditors = lazyRetry(() => import('./pages/AdminEditors'));
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage'));
const Starseed = lazyRetry(() => import('./pages/Starseed'));
const Scratchpad = lazyRetry(() => import('./pages/labs/Scratchpad'));
const LabsCanvas = lazyRetry(() => import('./pages/labs/Canvas'));
const CommandPalette = lazyRetry(() => import('./components/CommandPalette'));

import GameOverlay from './components/GameOverlay';
import Garden from './pages/Garden';
import Now from './pages/Now';
import Workshop from './pages/Workshop';
import Favorites from './pages/Favorites';
import Vault from './pages/Vault';
import { AudioProvider, useAudio } from './context/AudioContext';
import { AuthProvider } from './context/AuthContext';
import { HolidayProvider, useHoliday } from './context/HolidayContext';
import GlobalPlayer from './components/GlobalPlayer';
import AuthModal from './components/AuthModal';
import registry from './content/takeovers/registry';
import { useTakeoverState } from './hooks/useTakeoverState';
import { setupGlobalViewTransitions } from './utils/viewTransitions';

/* ── Registry-driven lazy page components ──────────────────
 * Created at module level so React.lazy() is called once per page,
 * not on every render.  Adding a new campaign to the registry
 * requires ZERO changes to this file. */
const ReleaseShell = lazyRetry(() => import('./pages/release/ReleaseShell'));

const takeoverPages = Object.fromEntries(
  registry.map((entry) => [
    entry.id,
    {
      landing: lazyRetry(entry.pages.landing),
      artist:  lazyRetry(entry.pages.artist),
      epk:     lazyRetry(entry.pages.epk),
    },
  ])
);

/* ── Config cache — loaded once per campaign, reused across navigations ── */
const configCache = {};

function useTakeoverConfig(entry) {
  const [config, setConfig] = useState(configCache[entry?.id] ?? null);

  useEffect(() => {
    if (!entry) return;
    if (configCache[entry.id]) {
      setConfig(configCache[entry.id]);
      return;
    }
    entry.loadConfig().then((mod) => {
      configCache[entry.id] = mod.default;
      setConfig(mod.default);
    });
  }, [entry?.id]);

  return config;
}

/* ── Suspense fallback ─────────────────────────────────────── */
const LOADING_STYLE = { color: 'white', padding: '2rem', textAlign: 'center' };
function LazyFallback({ label = 'Loading...' }) {
  return <div style={LOADING_STYLE}>{label}</div>;
}

/* ── TakeoverRoute — registry-driven campaign page wrapper ─ *
 * Loads config from the registry entry, resolves the lazy page
 * component, and wraps everything in ReleaseShell. */
function TakeoverRoute({ entry, pageKey, takeover }) {
  const config = useTakeoverConfig(entry);
  const Page = takeoverPages[entry?.id]?.[pageKey];

  if (!config || !Page) return <LazyFallback />;

  return (
    <Suspense fallback={<LazyFallback />}>
      <ReleaseShell config={config} phase={takeover.phase} exposure={takeover.exposure}>
        <Page phase={takeover.phase} />
      </ReleaseShell>
    </Suspense>
  );
}

/* ── HolidayBodyClass — adds/removes body classes ────────── *
 * Inside Router so it can be disabled on release routes
 * via the `disabled` prop (driven by chrome.disableHolidayBodyFx). */
function HolidayBodyClass({ disabled }) {
  const { isBirthday, holiday } = useHoliday();
  React.useEffect(() => {
    const catClass = holiday ? `holiday-${holiday.category}` : null;

    if (disabled) {
      document.body.classList.remove('birthday-mode');
      if (catClass) document.body.classList.remove(catClass);
      return () => {};
    }

    if (isBirthday) {
      document.body.classList.add('birthday-mode');
    } else {
      document.body.classList.remove('birthday-mode');
    }
    if (catClass && holiday.tier >= 2 && !isBirthday) {
      document.body.classList.add(catClass);
    }
    return () => {
      document.body.classList.remove('birthday-mode');
      if (catClass) document.body.classList.remove(catClass);
    };
  }, [isBirthday, holiday, disabled]);
  return null;
}

/* ── AppContent — route-aware layout with chrome scoping ── */
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const takeover = useTakeoverState();
  const { pausePlayback } = useAudio();
  const prevReleaseRef = useRef(false);

  // Determine if we're in a "release context":
  //   - On any /music/* path (preview/archived routes)
  //   - On the homepage during takeover mode or admin preview
  const isReleaseRoute = location.pathname.startsWith('/music/');
  const isTakeoverHome =
    location.pathname === '/' &&
    !takeover.loading &&
    (takeover.exposure === 'takeover' || takeover.isAdminPreview);
  // Alias routes: always treat as release context when a campaign entry
  // exists, so chrome rules (hideNavbar, etc.) apply regardless of mode.
  const isAliasPath =
    location.pathname === '/artist' || location.pathname === '/epk';
  const isAliasRelease = isAliasPath && !!takeover.entry;
  const isReleaseContext = isReleaseRoute || isTakeoverHome || isAliasRelease;
  const isStarseedRoute = location.pathname.startsWith('/starseed');

  // Chrome rules — only apply when in release context
  const chrome = isReleaseContext ? takeover.chrome : {};

  // Pause site music when entering a release context (one-shot via ref guard)
  useEffect(() => {
    if (isReleaseContext && !prevReleaseRef.current) {
      pausePlayback();
    }
    prevReleaseRef.current = isReleaseContext;
  }, [isReleaseContext, pausePlayback]);

  // Global View Transitions -- wraps all <Link> clicks with startViewTransition
  useEffect(() => {
    const cleanup = setupGlobalViewTransitions(navigate);
    return cleanup;
  }, [navigate]);

  // Cmd+K / Ctrl+K opens command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global action listener for navigation (glint-action events)
  useEffect(() => {
    const handleGlintAction = (e) => {
      const { action, params } = e.detail || {};
      if (action === 'navigate' && params?.destination) {
        navigate(params.destination);
      }
    };
    window.addEventListener('glint-action', handleGlintAction);
    return () => window.removeEventListener('glint-action', handleGlintAction);
  }, [navigate]);

  return (
    <div className="app-container">
      <HolidayBodyClass disabled={!!(isReleaseContext && chrome.disableHolidayBodyFx)} />

      {/* Site chrome — hidden per campaign chrome rules */}
      {!chrome.hideNavbar && !isStarseedRoute && <Navbar />}
      {!chrome.hideGameOverlay && <GameOverlay />}
      {!chrome.hideGlobalPlayer && <GlobalPlayer />}

      <main className="main-content">
        <Routes>
          {/* ── Homepage: loading gate → takeover → normal ── */}
          <Route path="/" element={
            takeover.loading
              ? <LazyFallback />
              : (takeover.exposure === 'takeover' || takeover.isAdminPreview) && takeover.entry
                ? <TakeoverRoute entry={takeover.entry} pageKey="landing" takeover={takeover} />
                : <Home />
          } />

          {/* ── /world: displaced homepage (escape hatch during takeover) ── */}
          <Route path="/world" element={<Home />} />

          {/* ── Registry-driven release routes (generated from registry) ── */}
          {registry.map((entry) => (
            <React.Fragment key={entry.id}>
              <Route
                path={entry.previewBasePath}
                element={<TakeoverRoute entry={entry} pageKey="landing" takeover={takeover} />}
              />
              <Route
                path={`${entry.previewBasePath}/artist`}
                element={<TakeoverRoute entry={entry} pageKey="artist" takeover={takeover} />}
              />
              <Route
                path={`${entry.previewBasePath}/epk`}
                element={<TakeoverRoute entry={entry} pageKey="epk" takeover={takeover} />}
              />
            </React.Fragment>
          ))}

          {/* ── Takeover top-level aliases ─────────────────────── *
            * Always mounted so cold loads to /artist or /epk hit a
            * route immediately.  Loading gate shows neutral splash
            * until Supabase resolves; if the campaign isn't in
            * takeover mode the route simply renders nothing (React
            * Router falls through to no-match). */}
          <Route path="/artist" element={
            takeover.loading
              ? <LazyFallback />
              : takeover.entry
                ? <TakeoverRoute entry={takeover.entry} pageKey="artist" takeover={takeover} />
                : null
          } />
          <Route path="/epk" element={
            takeover.loading
              ? <LazyFallback />
              : takeover.entry
                ? <TakeoverRoute entry={takeover.entry} pageKey="epk" takeover={takeover} />
                : null
          } />

          {/* ── Normal site routes ── */}
          <Route path="/tools/sd-profile-patcher" element={<Patcher />} />
          <Route path="/projects/beamy" element={<BeamyProject />} />
          <Route path="/projects/starseed" element={<StarseedProject />} />
          <Route path="/workshop" element={<Workshop />} />
          <Route path="/starseed" element={
            <Suspense fallback={<LazyFallback label="Loading Starseed..." />}>
              <Starseed />
            </Suspense>
          } />
          <Route path="/starseed/labs/scratchpad" element={
            <Suspense fallback={<LazyFallback label="Loading Scratchpad..." />}>
              <Scratchpad />
            </Suspense>
          } />
          <Route path="/starseed/labs/canvas" element={
            <Suspense fallback={<LazyFallback label="Loading Canvas..." />}>
              <LabsCanvas />
            </Suspense>
          } />
          <Route path="/universe" element={
            <Suspense fallback={<LazyFallback label="Loading Universe..." />}>
              <UniversePage />
            </Suspense>
          } />
          <Route path="/garden" element={<Garden />} />
          <Route path="/now" element={<Now />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/constellation" element={
            <Suspense fallback={<LazyFallback label="Loading Constellation..." />}>
              <ConstellationPage />
            </Suspense>
          } />
          <Route path="/constellation/:nodeId" element={
            <Suspense fallback={<LazyFallback label="Loading Constellation..." />}>
              <ConstellationPage />
            </Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<LazyFallback label="Loading Profile..." />}>
              <ProfilePage />
            </Suspense>
          } />

          {/* ── Admin routes ── */}
          <Route path="/admin" element={
            <Suspense fallback={<LazyFallback label="Loading Admin..." />}>
              <AdminPage />
            </Suspense>
          } />
          <Route path="/admin/games" element={
            <Suspense fallback={<LazyFallback label="Loading Game Lab..." />}>
              <AdminGames />
            </Suspense>
          } />
          <Route path="/admin/users" element={
            <Suspense fallback={<LazyFallback label="Loading Users..." />}>
              <AdminUsers />
            </Suspense>
          } />
          <Route path="/admin/content" element={
            <Suspense fallback={<LazyFallback label="Loading Content..." />}>
              <AdminContent />
            </Suspense>
          } />
          <Route path="/admin/campaigns" element={
            <Suspense fallback={<LazyFallback label="Loading Campaigns..." />}>
              <AdminCampaigns />
            </Suspense>
          } />
          <Route path="/admin/editors" element={
            <Suspense fallback={<LazyFallback label="Loading Editors..." />}>
              <AdminEditors />
            </Suspense>
          } />
        </Routes>
      </main>
      <AuthModal />
      <Suspense fallback={null}>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <AudioProvider>
      <AuthProvider>
      <HolidayProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <AppContent />
        </Router>
      </HolidayProvider>
      </AuthProvider>
    </AudioProvider>
  );
}

export default App;
