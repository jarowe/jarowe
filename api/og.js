// Vercel Function: Dynamic OG image generation per route
// GET /api/og?route=/constellation → returns 1200x630 PNG

import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'nodejs',
};

/* ── Route templates ──────────────────────────────────────────── */

function HomepageTemplate() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #080810 0%, #1a1a2e 50%, #0d0d20 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Star particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            borderRadius: '50%',
            background: `rgba(255,255,255,${0.2 + (i % 5) * 0.12})`,
            top: `${(i * 37 + 13) % 100}%`,
            left: `${(i * 53 + 7) % 100}%`,
          }}
        />
      ))}
      {/* Gold accent line */}
      <div
        style={{
          display: 'flex',
          width: '120px',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #dbb978, transparent)',
          marginBottom: '32px',
        }}
      />
      <div
        style={{
          display: 'flex',
          fontSize: '72px',
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-2px',
        }}
      >
        jarowe.com
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '24px',
          color: 'rgba(255,255,255,0.6)',
          marginTop: '16px',
          maxWidth: '600px',
          textAlign: 'center',
        }}
      >
        The most alive personal world on the internet
      </div>
      {/* Bottom gold accent */}
      <div
        style={{
          display: 'flex',
          width: '80px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #dbb978, transparent)',
          marginTop: '40px',
        }}
      />
    </div>
  );
}

function ConstellationTemplate() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #050510 0%, #0a0a24 50%, #080818 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Scattered dots suggesting constellation nodes */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${2 + (i % 4)}px`,
            height: `${2 + (i % 4)}px`,
            borderRadius: '50%',
            background: i % 5 === 0
              ? '#7c3aed'
              : i % 3 === 0
                ? '#38bdf8'
                : `rgba(255,255,255,${0.15 + (i % 4) * 0.1})`,
            top: `${(i * 29 + 11) % 100}%`,
            left: `${(i * 41 + 19) % 100}%`,
          }}
        />
      ))}
      {/* Connection lines between some dots */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: '30%',
          left: '25%',
          width: '200px',
          height: '1px',
          background: 'linear-gradient(90deg, rgba(124,58,237,0.4), transparent)',
          transform: 'rotate(25deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: '55%',
          left: '50%',
          width: '160px',
          height: '1px',
          background: 'linear-gradient(90deg, rgba(56,189,248,0.3), transparent)',
          transform: 'rotate(-15deg)',
        }}
      />
      <div
        style={{
          display: 'flex',
          fontSize: '64px',
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-1px',
        }}
      >
        Constellation
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '24px',
          color: 'rgba(255,255,255,0.55)',
          marginTop: '16px',
        }}
      >
        Explore a 3D map of life moments
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '16px',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '32px',
        }}
      >
        jarowe.com/constellation
      </div>
    </div>
  );
}

function GamesTemplate() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #1a0a2e 0%, #0d1a3e 50%, #0a0a24 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Playful geometric shapes */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: '15%',
          left: '10%',
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          border: '2px solid rgba(124,58,237,0.3)',
          transform: 'rotate(15deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          bottom: '20%',
          right: '12%',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid rgba(56,189,248,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: '60%',
          left: '8%',
          width: '30px',
          height: '30px',
          borderRadius: '6px',
          background: 'rgba(251,191,36,0.15)',
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          display: 'flex',
          fontSize: '56px',
          marginBottom: '8px',
        }}
      >
        🎮
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '64px',
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-1px',
        }}
      >
        Mini Games
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '24px',
          color: 'rgba(255,255,255,0.55)',
          marginTop: '16px',
        }}
      >
        Play 20+ mini-games
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '16px',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '32px',
        }}
      >
        jarowe.com
      </div>
    </div>
  );
}

function StarseedTemplate() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #080810 0%, #1a150e 50%, #0d0d0a 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gold accent particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            borderRadius: '50%',
            background: `rgba(219,185,120,${0.15 + (i % 4) * 0.08})`,
            top: `${(i * 41 + 17) % 100}%`,
            left: `${(i * 59 + 23) % 100}%`,
          }}
        />
      ))}
      {/* Gold accent line */}
      <div
        style={{
          display: 'flex',
          width: '100px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #dbb978, transparent)',
          marginBottom: '24px',
        }}
      />
      <div
        style={{
          display: 'flex',
          fontSize: '64px',
          fontWeight: 800,
          color: '#dbb978',
          letterSpacing: '-1px',
        }}
      >
        Starseed
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '24px',
          color: 'rgba(255,255,255,0.55)',
          marginTop: '16px',
        }}
      >
        Creative solutions &amp; labs
      </div>
      {/* Bottom gold accent */}
      <div
        style={{
          display: 'flex',
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #dbb978, transparent)',
          marginTop: '40px',
        }}
      />
      <div
        style={{
          display: 'flex',
          fontSize: '16px',
          color: 'rgba(219,185,120,0.4)',
          marginTop: '16px',
        }}
      >
        jarowe.com/starseed
      </div>
    </div>
  );
}

/* ── Route matching ───────────────────────────────────────────── */

function getTemplateForRoute(route) {
  if (!route || route === '/') return <HomepageTemplate />;
  const r = route.toLowerCase();
  if (r.startsWith('/constellation')) return <ConstellationTemplate />;
  if (r.includes('game')) return <GamesTemplate />;
  if (r.startsWith('/starseed')) return <StarseedTemplate />;
  // Fallback to homepage
  return <HomepageTemplate />;
}

/* ── Handler ──────────────────────────────────────────────────── */

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'jarowe.com'}`);
    const route = url.searchParams.get('route') || '/';

    const jsx = getTemplateForRoute(route);

    const imageResponse = new ImageResponse(jsx, {
      width: 1200,
      height: 630,
    });

    // Read the response body as a buffer
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Set caching headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(buffer);
  } catch (e) {
    console.error('OG image generation error:', e);
    res.status(500).json({ error: 'Failed to generate image' });
  }
}
