import { useEffect } from 'react';

export default function DungeonCrawl({ onComplete, theme }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(0), 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚧</div>
      <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>Dungeon Crawl</h3>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
        Coming soon! Check back for the full game.
      </p>
    </div>
  );
}
