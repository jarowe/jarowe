import { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { GAMES } from '../data/gameRegistry';
import { useAdminGuard } from '../hooks/useAdminGuard';
import './Admin.css';

const GameLauncher = lazy(() => import('../components/GameLauncher'));

const TIER_LABELS = { 1: 'T1', 2: 'T2', 3: 'T3' };
const VARIANT_FILTER = { all: 'All', base: 'Base Only', variants: 'Variants Only' };

export default function AdminGames() {
  const { allowed, loading: authLoading } = useAdminGuard();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState(null);
  const [variantFilter, setVariantFilter] = useState('all');
  const [activeGame, setActiveGame] = useState(null);

  const gameList = useMemo(() => {
    return Object.entries(GAMES).map(([id, game]) => ({
      id,
      ...game,
      isVariant: !!game.variant,
    }));
  }, []);

  const filtered = useMemo(() => {
    let result = gameList;

    if (tierFilter !== null) {
      result = result.filter((g) => g.tier === tierFilter);
    }

    if (variantFilter === 'base') {
      result = result.filter((g) => !g.isVariant);
    } else if (variantFilter === 'variants') {
      result = result.filter((g) => g.isVariant);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)
      );
    }

    // Sort: by tier, then name
    result.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

    return result;
  }, [gameList, tierFilter, variantFilter, searchQuery]);

  const counts = useMemo(() => {
    const c = { total: gameList.length, base: 0, variants: 0, t1: 0, t2: 0, t3: 0 };
    for (const g of gameList) {
      if (g.isVariant) c.variants++;
      else c.base++;
      if (g.tier === 1) c.t1++;
      else if (g.tier === 2) c.t2++;
      else if (g.tier === 3) c.t3++;
    }
    return c;
  }, [gameList]);

  if (authLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Checking access...</div>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</Link>
        <h1>Game Lab</h1>
        <p className="admin-subtitle">
          {counts.total} games ({counts.base} base + {counts.variants} variants) &mdash; T1: {counts.t1} &middot; T2: {counts.t2} &middot; T3: {counts.t3}
        </p>
      </header>

      {/* Filters */}
      <section className="admin-section admin-glass">
        <div className="admin-filters">
          <div className="admin-search">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="admin-input admin-search-input"
            />
          </div>

          <div className="admin-type-pills">
            <button
              className={`admin-pill ${tierFilter === null ? 'admin-pill-active' : ''}`}
              onClick={() => setTierFilter(null)}
            >
              All Tiers
            </button>
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                className={`admin-pill ${tierFilter === t ? 'admin-pill-active' : ''}`}
                onClick={() => setTierFilter(tierFilter === t ? null : t)}
              >
                T{t}
              </button>
            ))}
          </div>

          <div className="admin-type-pills">
            {Object.entries(VARIANT_FILTER).map(([key, label]) => (
              <button
                key={key}
                className={`admin-pill ${variantFilter === key ? 'admin-pill-active' : ''}`}
                onClick={() => setVariantFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Game Grid */}
      <section className="admin-section">
        <div className="admin-game-grid">
          {filtered.map((game) => (
            <div
              key={game.id}
              className="admin-game-card admin-glass"
              onClick={() => setActiveGame(game.id)}
            >
              <span className="admin-game-card-name">{game.name}</span>
              <div className="admin-game-card-meta">
                <span className={`admin-game-tier admin-game-tier-${game.tier}`}>
                  {TIER_LABELS[game.tier]}
                </span>
                <span className="admin-game-xp">{game.xp} XP</span>
                <span className="admin-game-duration">{game.duration}</span>
                {game.isVariant && (
                  <span className="admin-game-variant">{game.variant}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="admin-empty">
            <p>No games match your filters.</p>
          </div>
        )}
      </section>

      {/* GameLauncher overlay */}
      {activeGame && (
        <Suspense fallback={null}>
          <GameLauncher
            gameId={activeGame}
            holiday={{ name: 'Game Lab Test', tier: 3, category: 'tech', emoji: '🎮' }}
            onClose={() => setActiveGame(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
