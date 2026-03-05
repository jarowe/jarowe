import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Patcher from './pages/Patcher';
import BeamyProject from './pages/BeamyProject';
import React, { Suspense } from 'react';
import StarseedProject from './pages/StarseedProject';
const UniversePage = React.lazy(() => import('./pages/UniversePage'));
const ConstellationPage = React.lazy(() => import('./pages/ConstellationPage'));
const AdminPage = React.lazy(() => import('./pages/Admin'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
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
              </Routes>
              <GameOverlay />
              <GlobalPlayer />
            </main>
          </div>
        </Router>
      </HolidayProvider>
      </AuthProvider>
    </AudioProvider>
  );
}

export default App;
