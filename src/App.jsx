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
import GameOverlay from './components/GameOverlay';
import Garden from './pages/Garden';
import Now from './pages/Now';
import Workshop from './pages/Workshop';
import Favorites from './pages/Favorites';
import Vault from './pages/Vault';
import { AudioProvider } from './context/AudioContext';
import { BirthdayProvider, useBirthday } from './context/BirthdayContext';
import GlobalPlayer from './components/GlobalPlayer';

function BirthdayBodyClass() {
  const { isBirthday } = useBirthday();
  React.useEffect(() => {
    if (isBirthday) {
      document.body.classList.add('birthday-mode');
    } else {
      document.body.classList.remove('birthday-mode');
    }
    return () => document.body.classList.remove('birthday-mode');
  }, [isBirthday]);
  return null;
}

function App() {
  return (
    <AudioProvider>
      <BirthdayProvider>
        <BirthdayBodyClass />
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
      </BirthdayProvider>
    </AudioProvider>
  );
}

export default App;
