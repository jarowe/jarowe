import { useRef, useEffect, useCallback } from 'react';

/*  ═══════════════════════════════════════════════════════════
    PortalVFX – Canvas-based cinematic portal effect
    Doctor Strange sling ring + Rick & Morty vortex interior

    Props:
      phase     – null | 'seep' | 'gathering' | 'rupture' | 'emerging' | 'residual'
      originX   – CSS % string, e.g. '50%'
      originY   – CSS % string, e.g. '50%'
    ═══════════════════════════════════════════════════════════ */

const MAX_PARTICLES = 200;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// ── Utility ──
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// Wobble: 3-octave sine for organic ring shape
const wobble = (angle, time, baseR) =>
  baseR
  + Math.sin(angle * 3 + time * 1.5) * baseR * 0.07
  + Math.sin(angle * 5 - time * 2.1) * baseR * 0.045
  + Math.cos(angle * 7 + time * 3.3) * baseR * 0.025;

export default function PortalVFX({ phase, originX = '50%', originY = '50%' }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const phaseRef = useRef(null);
  const startTimeRef = useRef(0);

  // Lerp state – current values smoothly approach targets each frame
  const cur = useRef({
    ringRadius: 0,
    ringDraw: 0,        // 0→1 how much of ring is drawn
    interiorOp: 0,
    glowInt: 0,
    flashOp: 0,
    vignetteOp: 0,
    shockRadius: 0,
    shockOp: 0,
    particleRate: 0,
    seepOp: 0,
    seepRadius: 0,
  });
  const tgt = useRef({ ...cur.current });

  // Portal origin in pixels (updated from props)
  const originPx = useRef({ x: 0, y: 0 });

  // Particle pool
  const particles = useRef([]);
  const spawnAcc = useRef(0);

  // Ring draw start angle (random per sequence)
  const drawStartAngle = useRef(0);

  // Phase timing
  const phaseStartTime = useRef(0);

  // Gather phase: track whether ring draw has finished
  const ringDrawComplete = useRef(false);

  // Convert % string to px
  const pctToPx = useCallback((pctStr, dim) => {
    const v = parseFloat(pctStr);
    return (v / 100) * dim;
  }, []);

  // ── Spawn a particle ──
  const spawnParticle = useCallback((type, time) => {
    if (particles.current.length >= MAX_PARTICLES) return;
    const ox = originPx.current.x;
    const oy = originPx.current.y;
    const c = cur.current;

    if (type === 'ring') {
      // Particle orbits along ring edge
      const angle = Math.random() * TAU;
      const r = wobble(angle, time, c.ringRadius);
      particles.current.push({
        type: 'ring',
        x: ox + Math.cos(angle) * r,
        y: oy + Math.sin(angle) * r,
        vx: Math.cos(angle + Math.PI / 2) * (30 + Math.random() * 50),
        vy: Math.sin(angle + Math.PI / 2) * (30 + Math.random() * 50),
        life: 1,
        decay: 0.6 + Math.random() * 0.8,
        size: 1.5 + Math.random() * 2.5,
        hue: 260 + Math.random() * 80,
        brightness: 0.6 + Math.random() * 0.4,
      });
    } else {
      // Flying spark – burst outward from ring
      const angle = Math.random() * TAU;
      const r = c.ringRadius * (0.8 + Math.random() * 0.4);
      const speed = 60 + Math.random() * 180;
      particles.current.push({
        type: 'spark',
        x: ox + Math.cos(angle) * r,
        y: oy + Math.sin(angle) * r,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        prevX: ox + Math.cos(angle) * r,
        prevY: oy + Math.sin(angle) * r,
        life: 1,
        decay: 0.4 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
        hue: Math.random() < 0.3 ? 40 : (260 + Math.random() * 80), // gold or purple/blue
        brightness: 0.8 + Math.random() * 0.2,
      });
    }
  }, []);

  // ── Main render loop ──
  const draw = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const time = timestamp * 0.001;
    const dt = Math.min(1 / 30, 1 / 60); // fixed dt for consistent lerp
    const ox = originPx.current.x * DPR;
    const oy = originPx.current.y * DPR;
    const c = cur.current;
    const t = tgt.current;

    // ── Lerp all values toward targets ──
    const lerpSpeed = 4;
    const lerpAmt = 1 - Math.exp(-lerpSpeed * dt);
    c.ringRadius = lerp(c.ringRadius, t.ringRadius, lerpAmt);
    c.interiorOp = lerp(c.interiorOp, t.interiorOp, lerpAmt);
    c.glowInt = lerp(c.glowInt, t.glowInt, lerpAmt);
    c.vignetteOp = lerp(c.vignetteOp, t.vignetteOp, lerpAmt);
    c.particleRate = lerp(c.particleRate, t.particleRate, lerpAmt);
    c.seepOp = lerp(c.seepOp, t.seepOp, lerpAmt);
    c.seepRadius = lerp(c.seepRadius, t.seepRadius, lerpAmt);

    // Ring draw – time-driven during gathering, instant on rupture+
    if (phaseRef.current === 'gathering') {
      const elapsed = time - phaseStartTime.current;
      const gatherDur = (window.__prismConfig?.portalGatherMs ?? 500) / 1000;
      c.ringDraw = Math.min(1, elapsed / gatherDur);
      if (c.ringDraw >= 0.99) ringDrawComplete.current = true;
    } else if (phaseRef.current === 'rupture' || phaseRef.current === 'emerging') {
      c.ringDraw = lerp(c.ringDraw, 1, 0.3);
    } else if (phaseRef.current === 'residual' || phaseRef.current === null) {
      // keep at 1, radius handles collapse
    }

    // Flash – fast decay
    c.flashOp *= 0.88;
    if (c.flashOp < 0.01) c.flashOp = 0;

    // Shockwave – expand and fade
    if (c.shockOp > 0.01) {
      c.shockRadius += 600 * dt;
      c.shockOp *= 0.92;
      if (c.shockOp < 0.01) c.shockOp = 0;
    }

    // Scale radius by DPR for canvas coords
    const R = c.ringRadius * DPR;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // ── LAYER 1: Vignette ──
    if (c.vignetteOp > 0.01) {
      const vg = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(W, H) * 0.7);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(0.4, 'transparent');
      vg.addColorStop(0.7, `rgba(10,0,30,${0.25 * c.vignetteOp})`);
      vg.addColorStop(1, `rgba(5,0,15,${0.5 * c.vignetteOp})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // ── LAYER 2: Flash ──
    if (c.flashOp > 0.01) {
      const fg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 500 * DPR);
      fg.addColorStop(0, `rgba(200,180,255,${c.flashOp})`);
      fg.addColorStop(0.3, `rgba(124,58,237,${c.flashOp * 0.6})`);
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }

    // ── LAYER 2.5: Seep (Rick & Morty pre-noise) ──
    if (c.seepOp > 0.01 && c.seepRadius > 1) {
      const cfg = window.__prismConfig || {};
      const seepCol = cfg.portalSeepColor
        ? `${Math.round(cfg.portalSeepColor[0]*255)},${Math.round(cfg.portalSeepColor[1]*255)},${Math.round(cfg.portalSeepColor[2]*255)}`
        : '34,197,94';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sr = c.seepRadius * DPR;
      // Pulsating swirl
      for (let i = 0; i < 3; i++) {
        const a = time * (2.5 + i * 0.7) + i * TAU / 3;
        const dx = Math.cos(a) * sr * 0.15;
        const dy = Math.sin(a) * sr * 0.15;
        const sg = ctx.createRadialGradient(ox + dx, oy + dy, 0, ox + dx, oy + dy, sr);
        sg.addColorStop(0, `rgba(${seepCol},${c.seepOp * 0.5})`);
        sg.addColorStop(0.5, `rgba(${seepCol},${c.seepOp * 0.2})`);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.fillRect(ox - sr * 1.5, oy - sr * 1.5, sr * 3, sr * 3);
      }
      ctx.restore();
    }

    // ── LAYER 3: Ambient glow ──
    if (c.glowInt > 0.01 && R > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 2.5);
      gg.addColorStop(0, `rgba(124,58,237,${c.glowInt * 0.35})`);
      gg.addColorStop(0.3, `rgba(56,189,248,${c.glowInt * 0.2})`);
      gg.addColorStop(0.6, `rgba(167,139,250,${c.glowInt * 0.1})`);
      gg.addColorStop(1, 'transparent');
      ctx.fillStyle = gg;
      ctx.fillRect(ox - R * 3, oy - R * 3, R * 6, R * 6);
      ctx.restore();
    }

    // ── LAYER 4: Cosmic interior (clipped to wobbly ring) ──
    if (c.interiorOp > 0.01 && R > 5) {
      ctx.save();
      ctx.globalAlpha = c.interiorOp;

      // Build wobble clip path
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * TAU;
        const r = wobble(a, time, R);
        const px = ox + Math.cos(a) * r;
        const py = oy + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.clip();

      // Deep nebula base
      const ng = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
      ng.addColorStop(0, 'rgba(15,5,30,1)');
      ng.addColorStop(0.5, 'rgba(20,5,45,0.95)');
      ng.addColorStop(0.8, 'rgba(30,10,60,0.9)');
      ng.addColorStop(1, 'rgba(10,0,20,1)');
      ctx.fillStyle = ng;
      ctx.fillRect(ox - R, oy - R, R * 2, R * 2);

      // Rotating nebula clouds (3 layers)
      ctx.globalCompositeOperation = 'lighter';
      const cloudColors = [
        [124, 58, 237],   // purple
        [56, 189, 248],   // blue
        [244, 114, 182],  // pink
      ];
      for (let i = 0; i < 3; i++) {
        const ca = time * (0.4 + i * 0.15) * (i % 2 === 0 ? 1 : -1);
        const cdx = Math.cos(ca) * R * 0.2;
        const cdy = Math.sin(ca) * R * 0.2;
        const cc = cloudColors[i];
        const cg = ctx.createRadialGradient(
          ox + cdx, oy + cdy, 0,
          ox + cdx, oy + cdy, R * 0.8
        );
        cg.addColorStop(0, `rgba(${cc[0]},${cc[1]},${cc[2]},0.35)`);
        cg.addColorStop(0.4, `rgba(${cc[0]},${cc[1]},${cc[2]},0.15)`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.fillRect(ox - R, oy - R, R * 2, R * 2);
      }

      // Spiral swirl lines (5 concentric)
      ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 5; s++) {
        const sR = R * (0.3 + s * 0.14);
        const dir = s % 2 === 0 ? 1 : -1;
        const speed = (1.2 + s * 0.3) * dir;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(200,180,255,${0.12 - s * 0.015})`;
        ctx.lineWidth = (2.5 - s * 0.3) * DPR;
        for (let j = 0; j <= 200; j++) {
          const frac = j / 200;
          const a = frac * TAU * 2 + time * speed;
          const sr = sR * (0.3 + frac * 0.7);
          const px = ox + Math.cos(a) * sr;
          const py = oy + Math.sin(a) * sr;
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Center singularity
      const sg = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 0.25);
      sg.addColorStop(0, 'rgba(255,255,255,0.7)');
      sg.addColorStop(0.3, 'rgba(200,180,255,0.4)');
      sg.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = sg;
      ctx.fillRect(ox - R * 0.3, oy - R * 0.3, R * 0.6, R * 0.6);

      ctx.restore();
    }

    // ── LAYER 5: Vortex ring (3-pass) ──
    if (R > 2 && c.ringDraw > 0.005) {
      const startA = drawStartAngle.current;
      const endA = startA + c.ringDraw * TAU;
      const steps = Math.max(60, Math.floor(c.ringDraw * 180));

      // Helper to trace the wobbly arc
      const traceArc = (radiusOffset) => {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const a = startA + (i / steps) * (endA - startA);
          const r = wobble(a, time, R + radiusOffset);
          const px = ox + Math.cos(a) * r;
          const py = oy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      };

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      // Pass 1: outer glow
      traceArc(0);
      ctx.strokeStyle = `rgba(124,58,237,0.3)`;
      ctx.lineWidth = 18 * DPR;
      ctx.filter = `blur(${8 * DPR}px)`;
      ctx.stroke();
      ctx.filter = 'none';

      // Pass 2: main body
      traceArc(0);
      ctx.strokeStyle = `rgba(167,139,250,0.8)`;
      ctx.lineWidth = 6 * DPR;
      ctx.filter = `blur(${1 * DPR}px)`;
      ctx.stroke();
      ctx.filter = 'none';

      // Pass 3: hot core
      traceArc(0);
      ctx.strokeStyle = `rgba(220,210,255,0.9)`;
      ctx.lineWidth = 2 * DPR;
      ctx.stroke();

      ctx.restore();
    }

    // ── LAYER 6: Ring bright dots (~60 shimmer particles along ring) ──
    if (R > 10 && c.ringDraw > 0.1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const dotCount = Math.floor(60 * c.ringDraw);
      for (let i = 0; i < dotCount; i++) {
        const a = drawStartAngle.current + (i / 60) * TAU;
        const r = wobble(a, time, R);
        const shimmer = 0.4 + 0.6 * Math.sin(time * 8 + i * 1.7);
        const px = ox + Math.cos(a) * r;
        const py = oy + Math.sin(a) * r;
        const sz = (1.5 + Math.sin(i * 0.5 + time * 3) * 1) * DPR;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, TAU);
        ctx.fillStyle = `rgba(220,200,255,${shimmer * 0.6})`;
        ctx.fill();
      }
      ctx.restore();
    }

    // ── LAYER 7: Leading spark (gathering only) ──
    if (phaseRef.current === 'gathering' && c.ringDraw < 0.98 && R > 5) {
      const frontA = drawStartAngle.current + c.ringDraw * TAU;
      const r = wobble(frontA, time, R);
      const sx = ox + Math.cos(frontA) * r;
      const sy = oy + Math.sin(frontA) * r;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Big soft glow
      const lg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30 * DPR);
      lg.addColorStop(0, 'rgba(255,250,220,0.9)');
      lg.addColorStop(0.2, 'rgba(255,200,100,0.6)');
      lg.addColorStop(0.5, 'rgba(124,58,237,0.3)');
      lg.addColorStop(1, 'transparent');
      ctx.fillStyle = lg;
      ctx.fillRect(sx - 35 * DPR, sy - 35 * DPR, 70 * DPR, 70 * DPR);

      // Hot white core
      ctx.beginPath();
      ctx.arc(sx, sy, 3 * DPR, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fill();

      ctx.restore();
    }

    // ── LAYER 8: Shockwave ──
    if (c.shockOp > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(ox, oy, c.shockRadius * DPR, 0, TAU);
      ctx.strokeStyle = `rgba(167,139,250,${c.shockOp * 0.7})`;
      ctx.lineWidth = (3 - c.shockOp * 2) * DPR;
      ctx.stroke();

      // Outer haze
      ctx.beginPath();
      ctx.arc(ox, oy, c.shockRadius * DPR, 0, TAU);
      ctx.strokeStyle = `rgba(56,189,248,${c.shockOp * 0.3})`;
      ctx.lineWidth = 12 * DPR;
      ctx.filter = `blur(${6 * DPR}px)`;
      ctx.stroke();
      ctx.filter = 'none';
      ctx.restore();
    }

    // ── LAYER 9: Particles ──
    // Spawn new particles
    spawnAcc.current += c.particleRate * dt;
    while (spawnAcc.current >= 1 && particles.current.length < MAX_PARTICLES) {
      spawnAcc.current -= 1;
      const type = (phaseRef.current === 'rupture' || phaseRef.current === 'emerging')
        ? (Math.random() < 0.6 ? 'spark' : 'ring')
        : 'ring';
      spawnParticle(type, time);
    }

    // Update + render particles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        particles.current.splice(i, 1);
        continue;
      }

      // Store previous pos for trails
      if (p.type === 'spark') {
        p.prevX = p.x;
        p.prevY = p.y;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Ring particles: slight tangential drift
      if (p.type === 'ring') {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      // Sparks: slight gravity / drag
      if (p.type === 'spark') {
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.vy += 15 * dt; // slight gravity
      }

      const alpha = p.life * p.brightness;
      const hue = p.hue;
      const sz = p.size * DPR * p.life;

      if (p.type === 'spark' && p.prevX !== undefined) {
        // Motion trail
        ctx.beginPath();
        ctx.moveTo(p.prevX * DPR, p.prevY * DPR);
        ctx.lineTo(p.x * DPR, p.y * DPR);
        ctx.strokeStyle = `hsla(${hue},80%,70%,${alpha * 0.5})`;
        ctx.lineWidth = sz * 0.8;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Dot
      ctx.beginPath();
      ctx.arc(p.x * DPR, p.y * DPR, sz, 0, TAU);
      ctx.fillStyle = `hsla(${hue},80%,75%,${alpha})`;
      ctx.fill();
    }
    ctx.restore();

    // ── Check if we should stop ──
    const allDead =
      phaseRef.current === null &&
      c.ringRadius < 0.5 &&
      c.glowInt < 0.01 &&
      c.flashOp < 0.01 &&
      c.shockOp < 0.01 &&
      c.seepOp < 0.01 &&
      c.vignetteOp < 0.01 &&
      particles.current.length === 0;

    if (allDead) {
      rafRef.current = null;
      return;
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [spawnParticle]);

  // ── Phase change handler ──
  useEffect(() => {
    phaseRef.current = phase;
    const t = tgt.current;
    const c = cur.current;
    const time = performance.now() * 0.001;

    switch (phase) {
      case 'seep':
        drawStartAngle.current = Math.random() * TAU;
        ringDrawComplete.current = false;
        t.ringRadius = 0;
        t.interiorOp = 0;
        t.glowInt = 0.2;
        t.vignetteOp = 0.3;
        t.particleRate = 5;
        t.seepOp = 0.8;
        t.seepRadius = 80;
        break;

      case 'gathering':
        phaseStartTime.current = time;
        t.ringRadius = 140;
        // ringDraw is time-driven, not lerped
        t.interiorOp = 0;
        t.glowInt = 0.6;
        t.vignetteOp = 0.6;
        t.particleRate = 30;
        t.seepOp = 0;
        t.seepRadius = 0;
        break;

      case 'rupture':
        t.ringRadius = 160;
        c.ringDraw = 1; // snap full
        t.interiorOp = 1;
        t.glowInt = 1.0;
        t.vignetteOp = 0.8;
        t.particleRate = 80;
        // Trigger flash
        c.flashOp = 0.9;
        // Trigger shockwave
        c.shockRadius = 30;
        c.shockOp = 1;
        break;

      case 'emerging':
        t.ringRadius = 160;
        t.interiorOp = 0.8;
        t.glowInt = 0.7;
        t.vignetteOp = 0.4;
        t.particleRate = 40;
        break;

      case 'residual':
        t.ringRadius = 0;
        t.interiorOp = 0;
        t.glowInt = 0.2;
        t.vignetteOp = 0;
        t.particleRate = 5;
        break;

      case null:
      default:
        t.ringRadius = 0;
        t.interiorOp = 0;
        t.glowInt = 0;
        t.vignetteOp = 0;
        t.particleRate = 0;
        t.seepOp = 0;
        t.seepRadius = 0;
        break;
    }

    // Start animation loop if not running
    if (phase !== null && !rafRef.current) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [phase, draw]);

  // ── Resize handler ──
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Update origin when props change ──
  useEffect(() => {
    originPx.current.x = pctToPx(originX, window.innerWidth);
    originPx.current.y = pctToPx(originY, window.innerHeight);
  }, [originX, originY, pctToPx]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 499,
        pointerEvents: 'none',
        // Only visible when portal is active (but always mounted for instant start)
        opacity: phase !== null || cur.current.glowInt > 0.01 ? 1 : 0,
      }}
    />
  );
}
