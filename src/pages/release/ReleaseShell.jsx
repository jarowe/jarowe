/**
 * ReleaseShell — wrapper for all campaign routes.
 *
 * Responsibilities:
 *   1. Apply .release-{slug} root class + data-rollout-phase + data-exposure-mode
 *   2. Mount ReleaseNav instead of the site Navbar
 *   3. Apply .reduce-motion when prefers-reduced-motion is active
 *   4. Inject route-scoped CSS custom properties (palette tokens)
 *
 * This component does NOT suppress Navbar/GlobalPlayer/GameOverlay itself —
 * that happens in App.jsx via the chrome contract.  ReleaseShell only provides
 * the campaign-specific wrapper and design tokens.
 */

import { useEffect, useState } from 'react';
import ReleaseNav from './ReleaseNav';
import './ReleaseShell.css';

export default function ReleaseShell({ config, phase, exposure, children }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (e) => setReduceMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const rootClass = [
    'release-bitb',
    reduceMotion && 'reduce-motion',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClass}
      data-rollout-phase={phase}
      data-exposure-mode={exposure}
      style={{
        '--bitb-midnight':        config.palette.midnightNavy,
        '--bitb-indigo':          config.palette.smokedIndigo,
        '--bitb-indigo-solid':    config.palette.smokedIndigoSolid,
        '--bitb-gold':            config.palette.haloGold,
        '--bitb-gold-bright':     config.palette.haloGoldBright,
        '--bitb-rose':            config.palette.emberRose,
        '--bitb-rose-light':      config.palette.emberRoseLight,
        '--bitb-ivory':           config.palette.jellyfishIvory,
        '--bitb-ivory-dim':       config.palette.jellyfishIvoryDim,
        '--bitb-font-display':    config.fonts.display,
        '--bitb-font-body':       config.fonts.body,
        '--bitb-artwork-url':     `url("${config.album.artwork}")`,
        '--bitb-portrait-url':    config.artist?.portrait ? `url("${config.artist.portrait}")` : 'none',
      }}
    >
      <ReleaseNav config={config} phase={phase} exposure={exposure} />
      <main className="release-bitb__main">
        {children}
      </main>
    </div>
  );
}
