import { useRef, useEffect } from 'react';

// ── Cinematic energy beam from Glint to banner ──
// Canvas-rendered with traveling light pulses, saber core, prismatic particles, and bloom glow.
export default function GlintBeam({ startX, startY, endX, endY, duration = 1200 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Full viewport canvas
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Beam geometry
    const dx = endX - startX;
    const dy = endY - startY;
    const beamLength = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const perpX = -sin; // perpendicular
    const perpY = cos;

    // Particles along the beam
    const PARTICLE_COUNT = 30;
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        t: Math.random(),                    // position along beam 0-1
        offset: (Math.random() - 0.5) * 20,  // perpendicular offset
        speed: 0.3 + Math.random() * 0.7,     // travel speed
        size: 1 + Math.random() * 2.5,
        hue: Math.random() * 360,
        phase: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.5,
      });
    }

    // Traveling energy pulses
    const PULSE_COUNT = 4;
    const pulses = [];
    for (let i = 0; i < PULSE_COUNT; i++) {
      pulses.push({
        t: i / PULSE_COUNT,
        speed: 0.8 + Math.random() * 0.4,
        width: 30 + Math.random() * 40,
        intensity: 0.6 + Math.random() * 0.4,
      });
    }

    const totalDuration = duration;
    startTimeRef.current = performance.now();

    const draw = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / totalDuration, 1);

      ctx.clearRect(0, 0, W, H);

      // Phase timeline:
      // 0.00-0.25: beam extends from Glint to banner
      // 0.25-0.75: beam alive with traveling energy
      // 0.75-1.00: beam fades out from Glint end

      let beamStart = 0;
      let beamEnd;
      let globalAlpha;

      if (progress < 0.25) {
        // Extending
        beamEnd = progress / 0.25;
        globalAlpha = 1;
      } else if (progress < 0.75) {
        // Full beam, alive
        beamEnd = 1;
        globalAlpha = 1;
      } else {
        // Fading from start
        beamEnd = 1;
        beamStart = (progress - 0.75) / 0.25;
        globalAlpha = 1 - (progress - 0.75) / 0.25;
      }

      const time = elapsed * 0.001;

      // Helper: point along beam
      const bx = (t) => startX + dx * t;
      const by = (t) => startY + dy * t;

      // ── Layer 1: Outer glow (wide, soft) ──
      ctx.save();
      ctx.globalAlpha = globalAlpha * 0.15;
      ctx.globalCompositeOperation = 'screen';
      for (let layer = 0; layer < 3; layer++) {
        const width = 18 - layer * 4;
        const hueShift = time * 60 + layer * 120;
        const gradient = ctx.createLinearGradient(bx(beamStart), by(beamStart), bx(beamEnd), by(beamEnd));
        gradient.addColorStop(0, `hsla(${280 + hueShift % 360}, 100%, 70%, 0)`);
        gradient.addColorStop(0.2, `hsla(${280 + hueShift % 360}, 100%, 70%, 0.4)`);
        gradient.addColorStop(0.5, `hsla(${200 + hueShift % 360}, 100%, 80%, 0.6)`);
        gradient.addColorStop(0.8, `hsla(${320 + hueShift % 360}, 100%, 70%, 0.4)`);
        gradient.addColorStop(1, `hsla(${200 + hueShift % 360}, 100%, 70%, 0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.shadowColor = `hsla(${260 + hueShift % 360}, 100%, 60%, 0.5)`;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(bx(beamStart), by(beamStart));
        ctx.lineTo(bx(beamEnd), by(beamEnd));
        ctx.stroke();
      }
      ctx.restore();

      // ── Layer 2: Saber core (bright, narrow, flickering) ──
      ctx.save();
      const flicker = 0.85 + 0.15 * Math.sin(time * 12) * Math.sin(time * 7.3);
      ctx.globalAlpha = globalAlpha * flicker;
      ctx.globalCompositeOperation = 'screen';

      // Inner white-hot core
      const coreGrad = ctx.createLinearGradient(bx(beamStart), by(beamStart), bx(beamEnd), by(beamEnd));
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      coreGrad.addColorStop(0.05, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(0.5, 'rgba(220, 200, 255, 1)');
      coreGrad.addColorStop(0.95, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(200, 160, 255, 0.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(bx(beamStart), by(beamStart));
      ctx.lineTo(bx(beamEnd), by(beamEnd));
      ctx.stroke();

      // Chromatic aberration layers (RGB split)
      const aberrationAmt = 2.5 + Math.sin(time * 3) * 1;
      const chromaColors = [
        { color: 'rgba(255, 80, 80, 0.4)', offset: -aberrationAmt },
        { color: 'rgba(80, 255, 80, 0.3)', offset: 0 },
        { color: 'rgba(80, 120, 255, 0.4)', offset: aberrationAmt },
      ];
      for (const { color, offset } of chromaColors) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(bx(beamStart) + perpX * offset, by(beamStart) + perpY * offset);
        ctx.lineTo(bx(beamEnd) + perpX * offset, by(beamEnd) + perpY * offset);
        ctx.stroke();
      }
      ctx.restore();

      // ── Layer 3: Traveling energy pulses (saber-like) ──
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const pulse of pulses) {
        const pt = ((pulse.t + time * pulse.speed * 0.5) % 1);
        if (pt < beamStart || pt > beamEnd) continue;

        const px = bx(pt);
        const py = by(pt);
        const pulseAlpha = globalAlpha * pulse.intensity * (1 - Math.abs(pt - 0.5) * 0.4);

        // Radial glow at pulse position
        const grad = ctx.createRadialGradient(px, py, 0, px, py, pulse.width * 0.5);
        grad.addColorStop(0, `hsla(${(time * 100 + pt * 360) % 360}, 100%, 90%, ${pulseAlpha * 0.6})`);
        grad.addColorStop(0.3, `hsla(${(time * 80 + pt * 360 + 40) % 360}, 100%, 70%, ${pulseAlpha * 0.3})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(px - pulse.width, py - pulse.width, pulse.width * 2, pulse.width * 2);

        // Bright center dot
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha * 0.9})`;
        ctx.shadowColor = 'rgba(200, 150, 255, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fill();
      }
      ctx.restore();

      // ── Layer 4: Prismatic edge particles ──
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const p of particles) {
        const pt = ((p.t + time * p.speed * 0.3 + p.phase) % 1);
        if (pt < beamStart || pt > beamEnd) continue;

        const wobble = Math.sin(time * 4 + p.phase) * (6 + p.offset * 0.5);
        const px = bx(pt) + perpX * (p.offset + wobble + p.drift * Math.sin(time * 2 + p.phase));
        const py = by(pt) + perpY * (p.offset + wobble + p.drift * Math.sin(time * 2 + p.phase));
        const sparkle = 0.3 + 0.7 * Math.abs(Math.sin(time * 6 + p.phase * 3));
        const pAlpha = globalAlpha * sparkle * 0.6;

        ctx.beginPath();
        ctx.arc(px, py, p.size * sparkle, 0, Math.PI * 2);
        const hue = (p.hue + time * 40) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${pAlpha})`;
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.5)`;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.restore();

      // ── Layer 5: Impact glow at banner end ──
      if (beamEnd >= 0.95 && progress >= 0.2) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const impactPulse = 0.5 + 0.5 * Math.sin(time * 8);
        const impactAlpha = globalAlpha * (0.3 + 0.2 * impactPulse);
        const impactRadius = 25 + 15 * impactPulse;
        const impGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, impactRadius);
        impGrad.addColorStop(0, `rgba(255, 255, 255, ${impactAlpha})`);
        impGrad.addColorStop(0.3, `hsla(${(time * 60) % 360}, 100%, 80%, ${impactAlpha * 0.6})`);
        impGrad.addColorStop(0.6, `hsla(${(time * 60 + 120) % 360}, 100%, 60%, ${impactAlpha * 0.3})`);
        impGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = impGrad;
        ctx.fillRect(endX - impactRadius, endY - impactRadius, impactRadius * 2, impactRadius * 2);
        ctx.restore();
      }

      // ── Layer 6: Source glow at Glint ──
      if (progress < 0.9) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const srcPulse = 0.6 + 0.4 * Math.sin(time * 10);
        const srcAlpha = globalAlpha * 0.4 * srcPulse;
        const srcRadius = 15 + 8 * srcPulse;
        const srcGrad = ctx.createRadialGradient(startX, startY, 0, startX, startY, srcRadius);
        srcGrad.addColorStop(0, `rgba(200, 160, 255, ${srcAlpha})`);
        srcGrad.addColorStop(0.5, `rgba(124, 58, 237, ${srcAlpha * 0.5})`);
        srcGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = srcGrad;
        ctx.fillRect(startX - srcRadius, startY - srcRadius, srcRadius * 2, srcRadius * 2);
        ctx.restore();
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startX, startY, endX, endY, duration]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
