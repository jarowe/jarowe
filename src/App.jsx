import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Patcher from './pages/Patcher';
import BeamyProject from './pages/BeamyProject';
import React, { Suspense } from 'react';
import StarseedProject from './pages/StarseedProject';

// Retry wrapper for lazy imports — handles stale chunks after deployments
function lazyRetry(importFn) {
  return React.lazy(() =>
    importFn().catch(() => {
      // First import failed (likely stale chunk) — reload once
      const key = 'jarowe_chunk_reload';
      const last = sessionStorage.getItem(key);
      if (!last || Date.now() - parseInt(last, 10) > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return new Promise(() => {}); // Never resolves — page is reloading
      }
      // Already tried reloading — let error propagate to boundary
      return importFn();
    })
  );
}

const UniversePage = lazyRetry(() => import('./pages/UniversePage'));
const ConstellationPage = lazyRetry(() => import('./pages/ConstellationPage'));
const AdminPage = lazyRetry(() => import('./pages/Admin'));
const AdminGames = lazyRetry(() => import('./pages/AdminGames'));
const AdminStub = lazyRetry(() => import('./pages/AdminStub'));
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage'));
import GameOverlay from './components/GameOverlay';
import Garden from './pages/Garden';
import Now from './pages/Now';
import Workshop from './pages/Workshop';
import Favorites from './pages/Favorites';
import Vault from './pages/Vault';
import { AudioProvider } from './context/AudioContext';
import { AuthProvider } from './context/AuthContext';
import { HolidayProvider, useHoliday } from './context/HolidayContext';
import GlobalPlayer from './components/GlobalPlayer';
import AuthModal from './components/AuthModal';

function HolidayBodyClass() {
  const { isBirthday, holiday } = useHoliday();
  React.useEffect(() => {
    if (isBirthday) {
      document.body.classList.add('birthday-mode');
    } else {
      document.body.classList.remove('birthday-mode');
    }
    // Add holiday category class for T2+
    const catClass = holiday ? `holiday-${holiday.category}` : null;
    if (catClass && holiday.tier >= 2 && !isBirthday) {
      document.body.classList.add(catClass);
    }
    return () => {
      document.body.classList.remove('birthday-mode');
      if (catClass) document.body.classList.remove(catClass);
    };
  }, [isBirthday, holiday]);
  return null;
}

function App() {
  return (
    <AudioProvider>
      <AuthProvider>
      <HolidayProvider>
        <HolidayBodyClass />
        <Router basename={import.meta.env.BASE_URL}>
          <div className="app-container">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tools/sd-profile-patcher" element={<Patcher />} />
                <Route path="/projects/beamy" element={<BeamyProject />} />
                <Route path="/projects/starseed" element={<StarseedProject />} />
                <Route path="/workshop" element={<Workshop />} />
                <Route path="/universe" element={
                  <Suspense fallback={<div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Universe...</div>}>
                    <UniversePage />
                  </Suspense>
                } />
                <Route path="/garden" element={<Garden />} />
                <Route path="/now" element={<Now />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="/constellation" element={
                  <Suspense fallback={<div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Constellation...</div>}>
                    <ConstellationPage />
                  </Suspense>
                } />
                <Route path="/profile" element={
                  <Suspense fallback={<div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Profile...</div>}>
                    <ProfilePage />
                  </Suspense>
                } />
                <Route path="/admin" element={
                  <Suspense fallback={<div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Admin...</div>}>
                    <AdminPage />
                  </Suspense>
                } />
                <Route path="/admin/games" element={
                  <Suspense fallback={<div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Game Lab...</div>}>
                    <AdminGames />
                  </Suspense>
                } />
                <Route path="/admin/users" element={
                  <Suspense fallback={<div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                    <AdminStub page="users" />
                  </Suspense>
                } />
                <Route path="/admin/content" element={
                  <Suspense fallback={<div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                    <AdminStub page="content" />
                  </Suspense>
                } />
              </Routes>
              <GameOverlay />
              <GlobalPlayer />
            </main>
          </div>
          <AuthModal />
        </Router>
      </HolidayProvider>
      </AuthProvider>
    </AudioProvider>
  );
}

export default App;
