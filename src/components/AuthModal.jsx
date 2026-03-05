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
            IK ASTRONAUT V5 — Full suit, glowing visor, energy aura,
            suit panel lights, detailed helmet with reflections.
            ══════════════════════════════════════════════════════════════ */}

        {/* Energy aura around the astronaut */}
        <ellipse cx="68" cy="58" rx="32" ry="36" fill="none" stroke="rgba(124,58,237,0.06)" strokeWidth="1.5" className="ik-aura a1" />
        <ellipse cx="68" cy="58" rx="38" ry="42" fill="none" stroke="rgba(103,232,249,0.04)" strokeWidth="1" className="ik-aura a2" />

        <g className="ik-float">
          {/* Tether — energy beam to black hole */}
          <path d="M82 60 Q105 50 125 60 Q140 72 148 83" stroke="rgba(167,139,250,0.12)" strokeWidth="1.2" fill="none" strokeDasharray="4 3" className="ik-tether" />
          <path d="M82 60 Q105 50 125 60 Q140 72 148 83" stroke="rgba(103,232,249,0.06)" strokeWidth="3" fill="none" filter="url(#ec-soft)" className="ik-tether" />
          {/* Tether particles flowing toward black hole */}
          <circle cx="95" cy="54" r="0.8" fill="#a78bfa" opacity="0.5" className="ik-tether-dot t1" />
          <circle cx="112" cy="56" r="0.6" fill="#67e8f9" opacity="0.4" className="ik-tether-dot t2" />
          <circle cx="128" cy="65" r="0.5" fill="#fbbf24" opacity="0.3" className="ik-tether-dot t3" />
          <circle cx="140" cy="76" r="0.4" fill="#f472b6" opacity="0.3" className="ik-tether-dot t4" />

          <g className="ik-torso">
            {/* ── BACKPACK / JETPACK (detailed) ── */}
            <rect x="79" y="47" width="7" height="16" rx="2" fill="rgba(15,12,35,0.9)" stroke="rgba(196,181,253,0.35)" strokeWidth="0.7" />
            {/* Pack panel lines */}
            <line x1="80" y1="51" x2="85" y2="51" stroke="rgba(196,181,253,0.12)" strokeWidth="0.3" />
            <line x1="80" y1="55" x2="85" y2="55" stroke="rgba(196,181,253,0.1)" strokeWidth="0.3" />
            <line x1="80" y1="59" x2="85" y2="59" stroke="rgba(196,181,253,0.08)" strokeWidth="0.3" />
            {/* Pack LEDs — 3 status lights */}
            <circle cx="81.5" cy="49" r="0.9" className="ik-pack-led" />
            <circle cx="84" cy="49" r="0.7" className="ik-pack-led l2" />
            <circle cx="82.5" cy="52.5" r="0.6" className="ik-pack-led l3" />
            {/* O2 tube from pack to helmet */}
            <path d="M81 47 Q79 42 77 38" stroke="rgba(103,232,249,0.15)" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M81 47 Q79 42 77 38" stroke="rgba(196,181,253,0.2)" strokeWidth="0.5" fill="none" strokeLinecap="round" />
            {/* Exhaust nozzles */}
            <rect x="80" y="63" width="2.5" height="2" rx="0.5" fill="rgba(30,25,60,0.8)" stroke="rgba(196,181,253,0.2)" strokeWidth="0.3" />
            <rect x="83.5" y="63" width="2.5" height="2" rx="0.5" fill="rgba(30,25,60,0.8)" stroke="rgba(196,181,253,0.2)" strokeWidth="0.3" />

            {/* ── TORSO SUIT (proper shaped body) ── */}
            <path d="M61 46 Q59 52 60 58 Q61 62 64 64 L67 65 L70 62 L73 65 L76 64 Q79 62 80 58 Q81 52 79 46 Q76 43 70 43 Q64 43 61 46 Z" fill="rgba(12,10,28,0.95)" stroke="rgba(196,181,253,0.5)" strokeWidth="0.9" />
            {/* Chest plate — glowing center */}
            <path d="M65 48 L75 48 L74 54 L66 54 Z" fill="none" stroke="rgba(196,181,253,0.2)" strokeWidth="0.4" />
            <rect x="68" y="49" width="4" height="3" rx="0.8" fill="rgba(103,232,249,0.08)" stroke="rgba(103,232,249,0.2)" strokeWidth="0.3" className="ik-chest-light" />
            {/* Belt */}
            <path d="M62 58 Q66 60 70 59 Q74 60 78 58" stroke="rgba(196,181,253,0.25)" strokeWidth="0.8" fill="none" />
            {/* Utility pouches */}
            <rect x="62" y="59" width="3" height="2.5" rx="0.6" fill="rgba(20,16,42,0.8)" stroke="rgba(196,181,253,0.15)" strokeWidth="0.3" />
            <rect x="75" y="59" width="3" height="2.5" rx="0.6" fill="rgba(20,16,42,0.8)" stroke="rgba(196,181,253,0.15)" strokeWidth="0.3" />
            {/* Shoulder joints — glowing circles */}
            <circle cx="62" cy="46" r="2.2" fill="rgba(15,12,35,0.8)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.5" />
            <circle cx="62" cy="46" r="0.8" fill="rgba(103,232,249,0.15)" className="ik-joint-glow" />
            <circle cx="78" cy="46" r="2.2" fill="rgba(15,12,35,0.8)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.5" />
            <circle cx="78" cy="46" r="0.8" fill="rgba(167,139,250,0.15)" className="ik-joint-glow j2" />
            {/* Suit edge glow — rim lighting from black hole */}
            <path d="M79 46 Q81 52 80 58 Q79 62 76 64" stroke="rgba(251,191,36,0.12)" strokeWidth="1.2" fill="none" filter="url(#ec-glow)" className="ik-rim-light" />

            {/* ── JETPACK EXHAUST (multi-layer) ── */}
            <ellipse cx="81.2" cy="68" rx="2.5" ry="8" fill="rgba(103,232,249,0.08)" className="ik-exhaust e1" />
            <ellipse cx="85" cy="68" rx="2" ry="7" fill="rgba(103,232,249,0.06)" className="ik-exhaust e2" />
            <ellipse cx="81.2" cy="69" rx="1.5" ry="5" fill="rgba(167,139,250,0.1)" className="ik-exhaust e3" />
            <ellipse cx="85" cy="69" rx="1.2" ry="4.5" fill="rgba(167,139,250,0.08)" className="ik-exhaust e4" />
            {/* Exhaust core — bright white */}
            <ellipse cx="81.2" cy="66" rx="0.8" ry="2" fill="rgba(255,255,255,0.15)" className="ik-exhaust-core" />
            <ellipse cx="85" cy="66" rx="0.6" ry="1.5" fill="rgba(255,255,255,0.12)" className="ik-exhaust-core c2" />
            {/* Exhaust sparks */}
            <circle cx="80" cy="74" r="0.7" fill="rgba(103,232,249,0.2)" className="ik-spark s1" />
            <circle cx="83" cy="77" r="0.5" fill="rgba(167,139,250,0.15)" className="ik-spark s2" />
            <circle cx="86" cy="75" r="0.4" fill="rgba(251,191,36,0.12)" className="ik-spark s3" />
            <circle cx="81" cy="79" r="0.35" fill="rgba(244,114,182,0.1)" className="ik-spark s4" />

            {/* ── HEAD / HELMET (detailed) ── */}
            <g className="ik-head">
              {/* Helmet dome — outer shell */}
              <ellipse cx="70" cy="36" rx="10" ry="10.5" fill="rgba(12,10,28,0.95)" stroke="rgba(196,181,253,0.6)" strokeWidth="1" />
              {/* Helmet trim highlight */}
              <path d="M61 33 Q65 26 74 25.5" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" fill="none" />
              <path d="M79 33 Q76 27 70 25.5" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" fill="none" />
              {/* Helmet edge glow from black hole light */}
              <path d="M79 30 Q81 35 79 42" stroke="rgba(251,191,36,0.15)" strokeWidth="1.5" fill="none" filter="url(#ec-glow)" className="ik-rim-light" />

              {/* VISOR — large reflective faceplate */}
              <ellipse cx="68" cy="35.5" rx="6" ry="6.5" fill="rgba(6,6,18,0.97)" stroke="rgba(103,232,249,0.3)" strokeWidth="0.5" />
              {/* Visor reflection gradient — shows accretion disc colors */}
              <ellipse cx="67" cy="34" rx="4.5" ry="5" fill="rgba(103,232,249,0.12)" className="ik-visor" />
              {/* Visor warm reflection (from disc) */}
              <ellipse cx="69" cy="36" rx="3" ry="3.5" fill="rgba(251,191,36,0.06)" className="ik-visor-warm" />
              {/* Visor primary highlight — crisp white */}
              <path d="M63.5 32 Q65 30 68 29.5" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              {/* Visor secondary highlight */}
              <path d="M64 34 Q65.5 32.5 67.5 32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none" strokeLinecap="round" />
              {/* Tiny star reflections inside visor */}
              <circle cx="65" cy="33" r="0.6" fill="rgba(255,255,255,0.85)" />
              <circle cx="67" cy="31" r="0.35" fill="rgba(255,255,255,0.5)" className="ik-visor-star vs1" />
              <circle cx="71" cy="37" r="0.25" fill="rgba(103,232,249,0.4)" className="ik-visor-star vs2" />
              <circle cx="64" cy="37" r="0.2" fill="rgba(251,191,36,0.4)" className="ik-visor-star vs3" />
              {/* Visor rim glow */}
              <ellipse cx="68" cy="35.5" rx="6.5" ry="7" fill="none" stroke="rgba(103,232,249,0.08)" strokeWidth="2" filter="url(#ec-glow)" className="ik-visor-glow" />

              {/* Helmet air vents */}
              <line x1="76" y1="33" x2="78" y2="34" stroke="rgba(196,181,253,0.2)" strokeWidth="0.4" />
              <line x1="76" y1="35" x2="78" y2="36" stroke="rgba(196,181,253,0.15)" strokeWidth="0.4" />

              {/* Antenna with glowing tip */}
              <line x1="76" y1="28" x2="80" y2="20" stroke="rgba(196,181,253,0.5)" strokeWidth="0.8" strokeLinecap="round" />
              <circle cx="80.5" cy="19" r="1.5" className="ik-antenna" />
              <circle cx="80.5" cy="19" r="3" fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="0.5" className="ik-antenna-ring" />

              {/* Helmet comm light */}
              <circle cx="61.5" cy="38" r="0.8" className="ik-comm-light" />
            </g>

            {/* ── LEFT ARM (reaching toward void — proper suit shape) ── */}
            <g className="ik-arm-l">
              {/* Upper arm — suit-shaped */}
              <path d="M60 45 L54 50 L52 54 L55 56 L58 52 L63 47 Z" fill="rgba(12,10,28,0.92)" stroke="rgba(196,181,253,0.4)" strokeWidth="0.7" />
              {/* Arm light stripe */}
              <line x1="60" y1="46" x2="54" y2="53" stroke="rgba(103,232,249,0.08)" strokeWidth="0.4" />
              {/* Elbow joint */}
              <circle cx="54" cy="54" r="2" fill="rgba(15,12,35,0.85)" stroke="rgba(196,181,253,0.25)" strokeWidth="0.5" />
              <circle cx="54" cy="54" r="0.7" fill="rgba(103,232,249,0.1)" className="ik-joint-glow" />

              <g className="ik-forearm-l">
                {/* Forearm — suit-shaped */}
                <path d="M52 53 L47 58 L45 62 L48 64 L51 60 L56 55 Z" fill="rgba(12,10,28,0.9)" stroke="rgba(196,181,253,0.35)" strokeWidth="0.6" />
                {/* Glove — detailed */}
                <path d="M44 61 Q43 63 44 65 Q45.5 67 47.5 66 Q49 65 49 63 Q48.5 61 47 60 Z" fill="rgba(12,10,28,0.95)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.5" />
                {/* Finger detail */}
                <line x1="44" y1="63" x2="43.5" y2="64.5" stroke="rgba(196,181,253,0.15)" strokeWidth="0.3" />
                <line x1="45.5" y1="64" x2="45" y2="65.5" stroke="rgba(196,181,253,0.12)" strokeWidth="0.3" />
                {/* Fingertip glow — reaching toward the void */}
                <circle cx="44" cy="65" r="1.5" fill="rgba(251,191,36,0.08)" className="ik-finger-glow" />
                <circle cx="44" cy="65" r="0.5" fill="rgba(255,255,255,0.15)" className="ik-finger-glow" />
              </g>
            </g>

            {/* ── RIGHT ARM (waving — proper suit shape) ── */}
            <g className="ik-arm-r">
              <path d="M80 45 L86 49 L89 53 L86 55 L84 51 L78 47 Z" fill="rgba(12,10,28,0.92)" stroke="rgba(196,181,253,0.4)" strokeWidth="0.7" />
              <line x1="80" y1="46" x2="87" y2="51" stroke="rgba(167,139,250,0.06)" strokeWidth="0.4" />
              <circle cx="88" cy="52" r="2" fill="rgba(15,12,35,0.85)" stroke="rgba(196,181,253,0.25)" strokeWidth="0.5" />
              <circle cx="88" cy="52" r="0.7" fill="rgba(167,139,250,0.1)" className="ik-joint-glow j2" />

              <g className="ik-forearm-r">
                <path d="M87 51 L91 46 L94 43 L96 45 L93 49 L89 53 Z" fill="rgba(12,10,28,0.9)" stroke="rgba(196,181,253,0.35)" strokeWidth="0.6" />
                {/* Glove */}
                <path d="M94 42 Q96 40 97 41 Q98 43 97 45 Q95.5 46 94 45 Q93 43.5 94 42 Z" fill="rgba(12,10,28,0.95)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.5" />
                <line x1="96" y1="41.5" x2="97" y2="40.5" stroke="rgba(196,181,253,0.15)" strokeWidth="0.3" />
                <circle cx="96.5" cy="41" r="1" fill="rgba(167,139,250,0.06)" className="ik-finger-glow" />
              </g>
            </g>

            {/* ── LEFT LEG (proper suit shape) ── */}
            <g className="ik-leg-l">
              <path d="M65 63 L62 68 L60 73 L63 74 L65 70 L67 65 Z" fill="rgba(12,10,28,0.92)" stroke="rgba(196,181,253,0.35)" strokeWidth="0.6" />
              <circle cx="61" cy="73" r="1.5" fill="rgba(15,12,35,0.85)" stroke="rgba(196,181,253,0.2)" strokeWidth="0.4" />
              <circle cx="61" cy="73" r="0.5" fill="rgba(196,181,253,0.08)" className="ik-joint-glow" />

              <g className="ik-shin-l">
                <path d="M59 72 L57 77 L55 82 L58 83 L60 78 L63 74 Z" fill="rgba(12,10,28,0.9)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.5" />
                {/* Boot */}
                <path d="M53 81 Q52 83 53 85 L59 85 Q60 83 59 82 L55 81 Z" fill="rgba(12,10,28,0.95)" stroke="rgba(196,181,253,0.25)" strokeWidth="0.5" />
                {/* Boot sole light */}
                <line x1="54" y1="85" x2="58" y2="85" stroke="rgba(103,232,249,0.15)" strokeWidth="0.6" className="ik-boot-glow" />
                {/* Boot thruster */}
                <ellipse cx="56" cy="87" rx="1.5" ry="2.5" fill="rgba(103,232,249,0.04)" className="ik-boot-thrust bt1" />
              </g>
            </g>

            {/* ── RIGHT LEG (proper suit shape) ── */}
            <g className="ik-leg-r">
              <path d="M75 63 L78 68 L80 73 L77 74 L75 70 L73 65 Z" fill="rgba(12,10,28,0.92)" stroke="rgba(196,181,253,0.35)" strokeWidth="0.6" />
              <circle cx="80" cy="73" r="1.5" fill="rgba(15,12,35,0.85)" stroke="rgba(196,181,253,0.2)" strokeWidth="0.4" />
              <circle cx="80" cy="73" r="0.5" fill="rgba(196,181,253,0.08)" className="ik-joint-glow j2" />

              <g className="ik-shin-r">
                <path d="M79 72 L81 77 L84 82 L81 83 L79 78 L77 74 Z" fill="rgba(12,10,28,0.9)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.5" />
                {/* Boot */}
                <path d="M83 81 Q85 83 84 85 L78 85 Q77 83 78 82 L82 81 Z" fill="rgba(12,10,28,0.95)" stroke="rgba(196,181,253,0.25)" strokeWidth="0.5" />
                <line x1="79" y1="85" x2="83" y2="85" stroke="rgba(167,139,250,0.12)" strokeWidth="0.6" className="ik-boot-glow b2" />
                <ellipse cx="81" cy="87" rx="1.5" ry="2.5" fill="rgba(167,139,250,0.03)" className="ik-boot-thrust bt2" />
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
