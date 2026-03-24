/**
 * CapsuleShell.jsx — Immersive memory-capsule viewer.
 *
 * Renders a full-screen memory scene with layered soundscape audio,
 * narrative text overlays, and (future) gaussian splat visuals.
 * The soundscape only activates after user interaction (click gate),
 * and site music is ducked to a low bed while the capsule is active.
 *
 * Route: /memory/:sceneId
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getScene } from '../data/memoryScenes';
import useSoundscape from '../hooks/useSoundscape';
import { useAudio } from '../context/AudioContext';

/* ── Styles ──────────────────────────────────────────────────── */
const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'radial-gradient(ellipse at center, #0a1628 0%, #000 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
  },
  gate: {
    textAlign: 'center',
    cursor: 'pointer',
    padding: '2rem',
    userSelect: 'none',
  },
  gateTitle: {
    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
    fontWeight: 300,
    letterSpacing: '0.04em',
    marginBottom: '0.5rem',
    opacity: 0.9,
  },
  gateSubtitle: {
    fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
    opacity: 0.5,
    marginBottom: '2rem',
  },
  gatePrompt: {
    fontSize: '0.9rem',
    opacity: 0.4,
    animation: 'capsulePulse 2s ease-in-out infinite',
  },
  narrative: {
    position: 'absolute',
    bottom: '12%',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: '600px',
    textAlign: 'center',
    fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
    fontWeight: 300,
    lineHeight: 1.6,
    opacity: 0.85,
    letterSpacing: '0.02em',
    textShadow: '0 2px 20px rgba(0,0,0,0.8)',
    transition: 'opacity 0.8s ease',
    padding: '0 1.5rem',
  },
  backLink: {
    position: 'absolute',
    top: '1.5rem',
    left: '1.5rem',
    zIndex: 110,
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    padding: '0.4rem 0.8rem',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.3s ease',
  },
  notFound: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#fff',
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

/* ── Inline keyframes (injected once) ────────────────────────── */
const KEYFRAMES_ID = 'capsule-shell-keyframes';
function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes capsulePulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);
}

export default function CapsuleShell() {
  const { sceneId } = useParams();
  const scene = getScene(sceneId);
  const { duckForCapsule, restoreFromCapsuleDuck } = useAudio();

  // soundscapeActive = user has clicked the gate to enter the experience
  const [soundscapeActive, setSoundscapeActive] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const narrativeTimersRef = useRef([]);

  const { start, stop, isActive } = useSoundscape(
    scene?.soundscape ?? null
  );

  // Inject CSS keyframes once
  useEffect(() => { injectKeyframes(); }, []);

  // When soundscapeActive flips on: duck site music, start soundscape
  useEffect(() => {
    if (soundscapeActive && scene) {
      duckForCapsule();
      start();
    }
    // Cleanup on deactivation or unmount
    return () => {
      if (soundscapeActive) {
        stop();
        restoreFromCapsuleDuck();
      }
    };
  }, [soundscapeActive, scene, duckForCapsule, restoreFromCapsuleDuck, start, stop]);

  // Narrative text sequencer — runs when soundscapeActive turns on
  useEffect(() => {
    if (!soundscapeActive || !scene?.narrative?.length) return;

    // Clear any existing timers
    narrativeTimersRef.current.forEach(clearTimeout);
    narrativeTimersRef.current = [];

    scene.narrative.forEach(({ time, text }) => {
      const timer = setTimeout(() => {
        setNarrativeText(text);
      }, time * 1000);
      narrativeTimersRef.current.push(timer);
    });

    return () => {
      narrativeTimersRef.current.forEach(clearTimeout);
      narrativeTimersRef.current = [];
    };
  }, [soundscapeActive, scene]);

  // Handle the click gate
  const handleEnter = useCallback(() => {
    setSoundscapeActive(true);
  }, []);

  // Scene not found
  if (!scene) {
    return (
      <div style={styles.notFound}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 300, marginBottom: '1rem' }}>
          Memory not found
        </h1>
        <p style={{ opacity: 0.5, marginBottom: '2rem' }}>
          No memory capsule exists for "{sceneId}".
        </p>
        <Link to="/" className="back-link">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back button — always visible */}
      <Link
        to="/"
        style={styles.backLink}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }}
      >
        &larr; Back
      </Link>

      {/* Click gate — shown before user activates the experience */}
      {!soundscapeActive && (
        <div style={styles.gate} onClick={handleEnter} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleEnter(); }}
        >
          <h1 style={styles.gateTitle}>{scene.title}</h1>
          <p style={styles.gateSubtitle}>{scene.subtitle}</p>
          <p style={styles.gatePrompt}>Click to enter</p>
        </div>
      )}

      {/* Active experience — narrative overlay (future: splat viewer here) */}
      {soundscapeActive && (
        <>
          {/* Portal color accent */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 60%, ${scene.portalColor}15 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          {/* Description */}
          <p style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '500px',
            textAlign: 'center',
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            fontWeight: 300,
            lineHeight: 1.7,
            opacity: 0.5,
            padding: '0 1.5rem',
          }}>
            {scene.description}
          </p>

          {/* Narrative text */}
          {narrativeText && (
            <div style={styles.narrative}>
              {narrativeText}
            </div>
          )}

          {/* Audio status indicator */}
          <div style={{
            position: 'absolute',
            bottom: '2rem',
            right: '2rem',
            fontSize: '0.75rem',
            opacity: 0.3,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isActive ? '#4ade80' : '#666',
              transition: 'background 0.5s',
            }} />
            {isActive ? 'Soundscape active' : 'Loading audio...'}
          </div>
        </>
      )}
    </div>
  );
}
