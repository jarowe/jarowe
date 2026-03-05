import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import './AuthModal.css';

/* ── Perk definitions with SVG icon paths ── */
const PERKS = [
  {
    id: 'cloud', label: 'CLOUD SYNC', color: '#06b6d4',
    burst: ['#06b6d4', '#67e8f9', '#0e7490'],
    icon: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    desc: 'Progress saved everywhere',
  },
  {
    id: 'trophy', label: 'LEADERBOARDS', color: '#fbbf24',
    burst: ['#fbbf24', '#fde68a', '#f59e0b'],
    icon: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M4 22h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" stroke="currentColor" strokeWidth="2" fill="none"/></>,
    desc: 'Compete globally',
  },
  {
    id: 'badge', label: '15 BADGES', color: '#f472b6',
    burst: ['#f472b6', '#f9a8d4', '#ec4899'],
    icon: <><circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="m15.477 12.89 1.414 8.485L12 18.5l-4.89 2.875 1.413-8.485" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
    desc: 'Unlock achievements',
  },
  {
    id: 'rocket', label: 'PROFILE', color: '#a855f7',
    burst: ['#a855f7', '#c4b5fd', '#7c3aed'],
    icon: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke="currentColor" strokeWidth="2" fill="none"/></>,
    desc: 'Your adventure hub',
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   ECLIPSE SCENE V3 — Cinematic black hole with orbiting astronaut
   ═══════════════════════════════════════════════════════════════════════ */
function EclipseScene() {
  return (
    <div className="eclipse-stage">
      {/* Gravitational wave pulses — expanding rings */}
      <div className="eclipse-wave w1" />
      <div className="eclipse-wave w2" />
      <div className="eclipse-wave w3" />
      {/* Layered CSS corona glows */}
      <div className="eclipse-corona c-hot" />
      <div className="eclipse-corona c-warm" />
      <div className="eclipse-corona c-purple" />
      <div className="eclipse-corona c-cyan" />
      <svg width="300" height="170" viewBox="0 0 300 170" fill="none" className="eclipse-svg">
        <defs>
          <radialGradient id="ec-hole" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#000" />
            <stop offset="85%" stopColor="#020617" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          {/* Photon ring — razor-bright */}
          <radialGradient id="ec-photon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="79%" stopColor="#a78bfa" stopOpacity="0.2" />
            <stop offset="84%" stopColor="#e0d4ff" stopOpacity="0.8" />
            <stop offset="86.5%" stopColor="#fff" stopOpacity="1" />
            <stop offset="89%" stopColor="#e0d4ff" stopOpacity="0.8" />
            <stop offset="94%" stopColor="#a78bfa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Inner photon ring — even tighter */}
          <radialGradient id="ec-photon2" cx="0.5" cy="0.5" r="0.5">
            <stop offset="78%" stopColor="transparent" />
            <stop offset="85%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="88%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="91%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Lensing halo */}
          <radialGradient id="ec-halo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="45%" stopColor="transparent" />
            <stop offset="62%" stopColor="#7c3aed" stopOpacity="0.1" />
            <stop offset="75%" stopColor="#a78bfa" stopOpacity="0.05" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Hot accretion disc — Doppler shifted (left=bright approach, right=dimmer recede) */}
          <linearGradient id="ec-acc-hot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="10%" stopColor="#f472b6" stopOpacity="0.5" />
            <stop offset="22%" stopColor="#fb923c" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="68%" stopColor="#fb923c" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#f472b6" stopOpacity="0.3" />
            <stop offset="92%" stopColor="#a855f7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ec-acc-cool" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="20%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#06b6d4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
          {/* Lensed arc gradient (the wrapped disc above/below) */}
          <linearGradient id="ec-lensed" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0" />
            <stop offset="30%" stopColor="#fb923c" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#fb923c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
          </linearGradient>
          {/* Jet gradients */}
          <linearGradient id="ec-jet-up" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#a78bfa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ec-jet-dn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.45" />
            <stop offset="30%" stopColor="#a78bfa" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <filter id="ec-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <filter id="ec-bloom" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <filter id="ec-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="ec-mega" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="8" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          {/* ── Realistic astronaut suit materials ── */}
          <linearGradient id="ik-suit" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#e8e4f0" />
            <stop offset="40%" stopColor="#d0cade" />
            <stop offset="100%" stopColor="#a8a0b8" />
          </linearGradient>
          <linearGradient id="ik-suit-dark" x1="0.2" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9890a8" />
            <stop offset="100%" stopColor="#706880" />
          </linearGradient>
          <linearGradient id="ik-gold-visor" x1="0.2" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor="#6b4f10" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#a37a1c" />
            <stop offset="50%" stopColor="#d4a832" />
            <stop offset="75%" stopColor="#ecc84e" />
            <stop offset="100%" stopColor="#fff8e0" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="ik-visor-disc" x1="1" y1="0.5" x2="0" y2="0.3">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="ik-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="ik-rim-warm" x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="60%" stopColor="#fb923c" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="ik-helmet-env" cx="0.6" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* ── Nebula wash ── */}
        <ellipse cx="150" cy="85" rx="140" ry="75" fill="rgba(124,58,237,0.035)" filter="url(#ec-soft)" className="ec-nebula n1" />
        <ellipse cx="100" cy="60" rx="85" ry="45" fill="rgba(6,182,212,0.025)" filter="url(#ec-soft)" className="ec-nebula n2" />
        <ellipse cx="200" cy="110" rx="65" ry="40" fill="rgba(244,114,182,0.02)" filter="url(#ec-soft)" className="ec-nebula n3" />

        {/* ── Stars ── */}
        <circle cx="12" cy="18" r="0.8" fill="#fff" opacity="0.7" className="ec-star s1" />
        <circle cx="38" cy="150" r="0.5" fill="#fff" opacity="0.4" className="ec-star s2" />
        <circle cx="62" cy="10" r="0.6" fill="#fbbf24" opacity="0.5" className="ec-star s3" />
        <circle cx="255" cy="28" r="0.7" fill="#67e8f9" opacity="0.6" className="ec-star s1" />
        <circle cx="275" cy="125" r="0.5" fill="#f472b6" opacity="0.5" className="ec-star s2" />
        <circle cx="232" cy="152" r="0.5" fill="#fff" opacity="0.35" className="ec-star s3" />
        <circle cx="22" cy="95" r="0.4" fill="#a78bfa" opacity="0.5" className="ec-star s1" />
        <circle cx="280" cy="68" r="0.6" fill="#fff" opacity="0.3" className="ec-star s2" />
        <circle cx="48" cy="52" r="0.35" fill="#67e8f9" opacity="0.4" className="ec-star s3" />
        <circle cx="242" cy="12" r="0.35" fill="#fbbf24" opacity="0.4" className="ec-star s1" />
        <circle cx="8" cy="135" r="0.4" fill="#fff" opacity="0.3" className="ec-star s2" />
        <circle cx="288" cy="48" r="0.4" fill="#c4b5fd" opacity="0.4" className="ec-star s3" />
        <circle cx="130" cy="8" r="0.3" fill="#fff" opacity="0.35" className="ec-star s1" />
        <circle cx="170" cy="162" r="0.3" fill="#67e8f9" opacity="0.3" className="ec-star s2" />

        {/* ── Polar jets — wider, brighter ── */}
        <path d="M144 48 L150 4 L156 48" fill="url(#ec-jet-up)" opacity="0.6" className="ec-jet jet-up" />
        <path d="M146 50 L150 14 L154 50" fill="rgba(255,255,255,0.2)" className="ec-jet jet-up" />
        <path d="M147 52 L150 28 L153 52" fill="rgba(255,255,255,0.1)" className="ec-jet jet-up" />
        <path d="M144 122 L150 166 L156 122" fill="url(#ec-jet-dn)" opacity="0.45" className="ec-jet jet-dn" />
        <path d="M146 120 L150 156 L154 120" fill="rgba(255,255,255,0.12)" className="ec-jet jet-dn" />

        {/* ── Outer accretion disc ── */}
        <ellipse cx="150" cy="85" rx="100" ry="10" fill="url(#ec-acc-cool)" opacity="0.3" className="ec-disc-outer" />

        {/* ── Hot accretion disc — multi-layer ── */}
        <ellipse cx="150" cy="85" rx="82" ry="8" fill="url(#ec-acc-hot)" opacity="0.6" className="ec-disc" />
        <ellipse cx="150" cy="85" rx="65" ry="5.5" fill="url(#ec-acc-hot)" opacity="0.85" className="ec-disc-inner" />
        <ellipse cx="150" cy="85" rx="48" ry="3" fill="url(#ec-acc-hot)" opacity="0.95" filter="url(#ec-glow)" className="ec-disc-core" />

        {/* ── Lensed disc arcs — Interstellar-style wrapped light ── */}
        <path d="M118 54 A 42 42 0 0 1 182 54" stroke="url(#ec-lensed)" strokeWidth="2.5" fill="none" opacity="0.4" className="ec-lensed top" />
        <path d="M122 52 A 38 38 0 0 1 178 52" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" className="ec-lensed top" />
        <path d="M120 116 A 40 40 0 0 0 180 116" stroke="url(#ec-lensed)" strokeWidth="2" fill="none" opacity="0.3" className="ec-lensed bot" />

        {/* ── Lensing halo ── */}
        <circle cx="150" cy="85" r="55" fill="url(#ec-halo)" className="ec-halo" />

        {/* ── Photon ring — double razor ring ── */}
        <circle cx="150" cy="85" r="34" fill="url(#ec-photon)" className="ec-photon" />
        <circle cx="150" cy="85" r="30" fill="url(#ec-photon2)" className="ec-photon p2" />

        {/* ── The void ── */}
        <circle cx="150" cy="85" r="27" fill="url(#ec-hole)" />
        <circle cx="150" cy="85" r="25" fill="#000" />

        {/* ── Event horizon edge — white-hot ── */}
        <circle cx="150" cy="85" r="26" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" filter="url(#ec-glow)" className="ec-horizon" />
        <circle cx="150" cy="85" r="27.5" fill="none" stroke="rgba(196,181,253,0.15)" strokeWidth="1.5" className="ec-horizon-glow" />

        {/* ── Front disc arc — passes in front of void ── */}
        <path d="M110 89 A 58 5 0 0 0 190 89" stroke="url(#ec-acc-hot)" strokeWidth="2.5" fill="none" opacity="0.5" filter="url(#ec-glow)" className="ec-front-disc" />

        {/* ── Corona wisps ── */}
        <path d="M108 58 Q125 40 150 37 Q175 40 192 58" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" fill="none" filter="url(#ec-glow)" className="ec-wisp w1" />
        <path d="M112 112 Q128 128 150 131 Q172 128 188 112" stroke="rgba(196,181,253,0.15)" strokeWidth="0.8" fill="none" className="ec-wisp w2" />
        <path d="M100 75 Q112 60 125 56" stroke="rgba(103,232,249,0.3)" strokeWidth="0.7" fill="none" className="ec-wisp w3" />
        <path d="M200 95 Q188 108 175 112" stroke="rgba(244,114,182,0.2)" strokeWidth="0.5" fill="none" className="ec-wisp w3" />

        {/* ── Mega bright rim ── */}
        <path d="M118 60 Q132 50 150 48 Q168 50 182 60" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" fill="none" filter="url(#ec-mega)" className="ec-edge" />

        {/* ══════════════════════════════════════════════════════════════
            ASTRONAUT V6 — Realistic NASA-style EVA suit.
            White pressurized fabric, gold reflective visor,
            PLSS backpack, warm rim lighting from accretion disc.
            ══════════════════════════════════════════════════════════════ */}

        <g className="ik-float" filter="url(#ec-glow)">
          {/* Safety tether — thin cable to black hole */}
          <path d="M82 55 Q106 44 128 58 Q142 70 148 83" stroke="rgba(200,200,210,0.08)" strokeWidth="0.5" fill="none" strokeDasharray="3 2" className="ik-tether" />

          <g className="ik-torso">
            {/* ── PLSS BACKPACK (Life Support) ── */}
            <rect x="79" y="42" width="8" height="20" rx="2.5" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
            {/* Pack panel detail */}
            <line x1="80.5" y1="46" x2="85.5" y2="46" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
            <line x1="80.5" y1="50" x2="85.5" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
            <line x1="80.5" y1="54" x2="85.5" y2="54" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
            {/* Status indicators */}
            <circle cx="81.5" cy="44" r="0.7" className="ik-pack-led" />
            <circle cx="84" cy="44" r="0.5" className="ik-pack-led l2" />
            {/* O2 hose to helmet */}
            <path d="M81 42 Q80 38 78 34" stroke="rgba(180,180,190,0.2)" strokeWidth="1.2" fill="none" strokeLinecap="round" />

            {/* ── TORSO — pressurized EVA suit ── */}
            <path d="M60 42 Q58 48 59 55 Q60 60 63 62 L67 63.5 L70 60 L73 63.5 L77 62 Q80 60 81 55 Q82 48 80 42 Q77 38 70 38 Q63 38 60 42 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
            {/* Suit shading — shadow side */}
            <path d="M60 42 Q58 48 59 55 Q60 60 63 62 L67 63.5 L70 60" fill="url(#ik-suit-dark)" opacity="0.3" />
            {/* Chest display unit */}
            <rect x="66" y="44" width="8" height="5" rx="1" fill="rgba(20,20,30,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
            <rect x="67.5" y="45.5" width="5" height="2" rx="0.5" fill="rgba(103,232,249,0.06)" stroke="rgba(103,232,249,0.12)" strokeWidth="0.2" className="ik-chest-light" />
            {/* USA flag patch area */}
            <rect x="62" y="44" width="3" height="2" rx="0.3" fill="rgba(200,60,60,0.08)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
            {/* Waist ring / bearing */}
            <ellipse cx="70" cy="57" rx="10.5" ry="1.5" fill="none" stroke="rgba(180,180,190,0.15)" strokeWidth="0.6" />
            {/* Suit connection rings at shoulders */}
            <circle cx="61" cy="42" r="2.5" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
            <circle cx="79" cy="42" r="2.5" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
            {/* Warm rim light from accretion disc (right edge) */}
            <path d="M80 42 Q82 48 81 55 Q80 60 77 62" stroke="rgba(251,191,36,0.2)" strokeWidth="1.5" fill="none" filter="url(#ec-glow)" className="ik-rim-light" />

            {/* ── MANEUVERING EXHAUST (subtle) ── */}
            <ellipse cx="83" cy="65" rx="1.8" ry="5" fill="rgba(200,210,230,0.04)" className="ik-exhaust e1" />
            <ellipse cx="83" cy="66" rx="1" ry="3" fill="rgba(255,255,255,0.03)" className="ik-exhaust e2" />

            {/* ── HELMET — realistic dome ── */}
            <g className="ik-head">
              {/* Helmet shell — white composite */}
              <ellipse cx="70" cy="30" rx="11.5" ry="12" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />
              {/* Helmet shading */}
              <ellipse cx="68" cy="31" rx="10" ry="10.5" fill="url(#ik-suit-dark)" opacity="0.2" />
              {/* Environment reflection on helmet */}
              <ellipse cx="70" cy="30" rx="11.5" ry="12" fill="url(#ik-helmet-env)" />
              {/* Helmet specular highlights */}
              <path d="M60 26 Q64 20 72 19" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" fill="none" />
              <path d="M62 28 Q65 23 71 22" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" fill="none" />
              {/* Warm rim glow from black hole on right side */}
              <path d="M80 24 Q82 30 80 38" stroke="rgba(251,191,36,0.2)" strokeWidth="2" fill="none" filter="url(#ec-glow)" className="ik-rim-light" />

              {/* GOLD VISOR — reflective faceplate */}
              <path d="M62 27 Q62 22.5 70 22 Q78 22.5 78 27 L78 35 Q78 39 70 39.5 Q62 39 62 35 Z" fill="url(#ik-gold-visor)" stroke="rgba(200,170,80,0.4)" strokeWidth="0.5" />
              {/* Visor depth — dark inner layer */}
              <path d="M63.5 27.5 Q63.5 24 70 23.5 Q76.5 24 76.5 27.5 L76.5 34 Q76.5 37.5 70 38 Q63.5 37.5 63.5 34 Z" fill="rgba(40,30,10,0.3)" />
              {/* Accretion disc reflection in visor */}
              <path d="M63.5 27.5 Q63.5 24 70 23.5 Q76.5 24 76.5 27.5 L76.5 34 Q76.5 37.5 70 38 Q63.5 37.5 63.5 34 Z" fill="url(#ik-visor-disc)" className="ik-visor-warm" />
              {/* Primary visor highlight — crisp white curve */}
              <path d="M64.5 26 Q67 23.5 72 23.5" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" fill="none" strokeLinecap="round" />
              {/* Secondary softer highlight */}
              <path d="M65 28 Q67 26 70 25.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" fill="none" strokeLinecap="round" />
              {/* Distant star reflections in visor */}
              <circle cx="66" cy="27" r="0.5" fill="rgba(255,255,255,0.6)" />
              <circle cx="74" cy="33" r="0.3" fill="rgba(255,200,100,0.4)" className="ik-visor-star vs1" />
              <circle cx="65" cy="34" r="0.2" fill="rgba(103,232,249,0.3)" className="ik-visor-star vs2" />

              {/* Chin / neck ring */}
              <ellipse cx="70" cy="38.5" rx="7" ry="1.5" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />

              {/* Headlamp (replaces cartoon antenna) */}
              <rect x="74" y="20.5" width="3" height="1.8" rx="0.6" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" />
              <circle cx="77.5" cy="21.4" r="1" className="ik-headlamp" />

              {/* Comm array — small realistic detail */}
              <rect x="60.5" y="33" width="1.5" height="3" rx="0.4" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
            </g>

            {/* ── LEFT ARM (reaching — pressurized suit) ── */}
            <g className="ik-arm-l">
              {/* Upper arm — bulky pressurized sleeve */}
              <path d="M59 41 Q55 44 53 48 Q51 52 53 54 Q55 55 57 53 Q59 49 61 45 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
              <path d="M59 41 Q55 44 53 48 Q51 52 53 54" fill="url(#ik-suit-dark)" opacity="0.25" />
              {/* Elbow bearing */}
              <circle cx="53" cy="53" r="2.2" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />

              <g className="ik-forearm-l">
                {/* Forearm */}
                <path d="M51.5 52 Q48 56 46 60 Q44.5 63 46 64.5 Q48 65 50 62 Q52 58 54.5 54 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
                <path d="M51.5 52 Q48 56 46 60" fill="none" stroke="url(#ik-rim-warm)" strokeWidth="1" />
                {/* Glove — white EVA glove */}
                <path d="M44.5 62 Q43 64 43.5 66 Q44.5 68 47 67 Q49 66 49.5 64 Q49 62 47.5 61 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
                {/* Finger creases */}
                <line x1="44.5" y1="64" x2="44" y2="65.5" stroke="rgba(160,150,175,0.2)" strokeWidth="0.3" />
                <line x1="46" y1="65" x2="45.5" y2="66.5" stroke="rgba(160,150,175,0.15)" strokeWidth="0.3" />
                {/* Wrist bearing */}
                <ellipse cx="48" cy="62" rx="2" ry="1.2" fill="none" stroke="rgba(180,180,190,0.12)" strokeWidth="0.4" />
              </g>
            </g>

            {/* ── RIGHT ARM (relaxed — pressurized suit) ── */}
            <g className="ik-arm-r">
              <path d="M81 41 Q85 44 87 48 Q89 52 87 54 Q85 55 83 53 Q81 49 79 45 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
              <path d="M81 41 Q85 44 87 48 Q89 52 87 54" fill="url(#ik-rim-warm)" opacity="0.6" />
              <circle cx="87" cy="53" r="2.2" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />

              <g className="ik-forearm-r">
                <path d="M88.5 52 Q91 48 93 44 Q94.5 41 93 40 Q91 39.5 89.5 42 Q87.5 46 86 51 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
                <path d="M88.5 52 Q91 48 93 44" fill="none" stroke="url(#ik-rim-warm)" strokeWidth="1.2" />
                {/* Glove */}
                <path d="M93.5 41 Q95 39 96 40 Q97 42 96 44 Q95 45 93.5 44 Q92.5 42.5 93.5 41 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
                <ellipse cx="90" cy="48" rx="2" ry="1.2" fill="none" stroke="rgba(180,180,190,0.1)" strokeWidth="0.3" />
              </g>
            </g>

            {/* ── LEFT LEG (pressurized suit) ── */}
            <g className="ik-leg-l">
              <path d="M65 61 Q63 65 61 70 Q59.5 74 61 75 Q63 75.5 64 72 Q66 67 67 63 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
              <path d="M65 61 Q63 65 61 70" fill="url(#ik-suit-dark)" opacity="0.2" />
              {/* Knee bearing */}
              <circle cx="61" cy="74" r="1.8" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />

              <g className="ik-shin-l">
                <path d="M59.5 73 Q58 77 56 81 Q55 84 56.5 85 Q58.5 85.5 59.5 82 Q61 78 62.5 74.5 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
                {/* Boot — chunky EVA boot */}
                <path d="M54 83 Q53 85 54 87 L60 87 Q61 85 60 84 L56 83 Z" fill="url(#ik-suit)" stroke="rgba(180,180,190,0.15)" strokeWidth="0.4" />
                <line x1="55" y1="87" x2="59" y2="87" stroke="rgba(180,180,190,0.12)" strokeWidth="0.5" />
              </g>
            </g>

            {/* ── RIGHT LEG (pressurized suit) ── */}
            <g className="ik-leg-r">
              <path d="M75 61 Q77 65 79 70 Q80.5 74 79 75 Q77 75.5 76 72 Q74 67 73 63 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
              <path d="M75 61 Q77 65 79 70" fill="url(#ik-rim-warm)" opacity="0.5" />
              <circle cx="79" cy="74" r="1.8" fill="url(#ik-metal)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />

              <g className="ik-shin-r">
                <path d="M80.5 73 Q82 77 84 81 Q85 84 83.5 85 Q81.5 85.5 80.5 82 Q79 78 77.5 74.5 Z" fill="url(#ik-suit)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
                {/* Boot */}
                <path d="M83 83 Q85 85 84 87 L78 87 Q77 85 78 84 L82 83 Z" fill="url(#ik-suit)" stroke="rgba(180,180,190,0.15)" strokeWidth="0.4" />
                <line x1="79" y1="87" x2="83" y2="87" stroke="rgba(180,180,190,0.1)" strokeWidth="0.5" />
              </g>
            </g>
          </g>
        </g>

        {/* ── Particles ── */}
        <circle cx="225" cy="78" r="0.9" fill="#67e8f9" opacity="0.7" className="ec-particle p1" />
        <circle cx="238" cy="90" r="0.5" fill="#a78bfa" opacity="0.55" className="ec-particle p2" />
        <circle cx="215" cy="62" r="0.45" fill="#f472b6" opacity="0.5" className="ec-particle p3" />
        <circle cx="60" cy="100" r="0.7" fill="#fbbf24" opacity="0.5" className="ec-particle p4" />
        <circle cx="48" cy="78" r="0.4" fill="#67e8f9" opacity="0.35" className="ec-particle p5" />
        <circle cx="220" cy="102" r="0.4" fill="#fff" opacity="0.4" className="ec-particle p1" />
        <circle cx="65" cy="68" r="0.35" fill="#c4b5fd" opacity="0.3" className="ec-particle p2" />
        <circle cx="242" cy="80" r="0.5" fill="#fb923c" opacity="0.45" className="ec-particle p3" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function AuthModal() {
  const { showAuthModal, closeAuthModal, signInWithGoogle, signInWithGitHub, signInWithEmail, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  /* ── Confetti burst on perk hover ── */
  const handlePerkHover = useCallback((perk, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    confetti({
      particleCount: 40, spread: 60, startVelocity: 25, gravity: 0.6, ticks: 80,
      origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      colors: perk.burst, shapes: ['circle', 'square'], scalar: 0.8,
      disableForReducedMotion: true,
    });
  }, []);

  /* ── Email submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await (mode === 'signup' ? signUp : signInWithEmail)(email, password);
      setLoading(false);
      if (err) {
        setError(err.message);
      } else {
        confetti({ particleCount: 120, spread: 90, origin: { x: 0.5, y: 0.4 }, colors: ['#7c3aed','#06b6d4','#fbbf24','#f472b6','#22c55e'] });
        setEmail(''); setPassword(''); setShowForm(false);
        closeAuthModal();
      }
    } catch (ex) {
      setLoading(false);
      setError(ex.message || 'Something went wrong');
    }
  };

  /* ── Close handler ── */
  const handleClose = useCallback(() => {
    setShowForm(false);
    setError('');
    closeAuthModal();
  }, [closeAuthModal]);

  /* ── Ref for click-outside detection ── */
  const modalRef = useRef(null);

  /* ── Escape key to close ── */
  useEffect(() => {
    if (!showAuthModal) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAuthModal, handleClose]);

  if (!showAuthModal) return null;

  return (
    <div className="auth-overlay"
      onClick={(e) => {
        // Close only when clicking the dark backdrop, not anything inside the modal
        if (modalRef.current && !modalRef.current.contains(e.target)) {
          handleClose();
        }
      }}>

      <div className="auth-modal" ref={modalRef}>

        <div className="auth-grain" />
        <div className="auth-glow g1" />
        <div className="auth-glow g2" />
        <div className="auth-glow g3" />
        <div className="auth-specular" />

        {/* ── Close X ── */}
        <button className="auth-close" onClick={handleClose} aria-label="Close" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* ── Hero: Eclipse Scene ── */}
        <div className="auth-hero">
          <EclipseScene />
          <h2 className="auth-title">
            <span className="auth-title-sm">WHERE IDEAS</span>
            <span className="auth-title-lg">COME ALIVE</span>
          </h2>
          <p className="auth-sub">Create, explore, and bring your vision to life</p>
        </div>

        {/* ── Perks — glass cards with icons + confetti ── */}
        <div className="auth-perks">
          {PERKS.map((perk, i) => (
            <div key={perk.id} className="auth-perk"
              style={{ '--pc': perk.color, animationDelay: `${0.12 + i * 0.07}s` }}
              onMouseEnter={(e) => handlePerkHover(perk, e)}>
              <div className="auth-perk-ring">
                <svg width="24" height="24" viewBox="0 0 24 24" className="auth-perk-icon">{perk.icon}</svg>
              </div>
              <span className="auth-perk-label">{perk.label}</span>
              <span className="auth-perk-desc">{perk.desc}</span>
            </div>
          ))}
        </div>

        {/* ── Auth Actions ── */}
        <div className="auth-actions">
          {!showForm ? (
            <div className="auth-oauth-group">
              <button className="auth-oauth auth-google" type="button"
                onClick={() => signInWithGoogle()}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button className="auth-oauth auth-github" type="button"
                onClick={() => signInWithGitHub()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span>Continue with GitHub</span>
              </button>

              <div className="auth-divider">
                <span className="auth-divider-line" />
                <button className="auth-divider-text" type="button" onClick={() => setShowForm(true)}>or use email</button>
                <span className="auth-divider-line" />
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <input type="email" placeholder="EMAIL" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="auth-input" autoComplete="email" autoFocus />
              <input type="password" placeholder="PASSWORD" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="auth-input" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? '...' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
              </button>
              <p className="auth-toggle">
                {mode === 'signin' ? 'New here? ' : 'Already in? '}
                <button type="button" className="auth-toggle-btn"
                  onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
                  {mode === 'signin' ? 'Create account' : 'Sign in'}
                </button>
              </p>
              <button type="button" className="auth-back" onClick={() => { setShowForm(false); setError(''); }}>
                &larr; back to social login
              </button>
            </form>
          )}
        </div>

        <p className="auth-footer">Free forever. No spam. Just fun.</p>
      </div>
    </div>
  );
}
