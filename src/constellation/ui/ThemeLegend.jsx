import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useConstellationStore } from '../store';
import './ThemeLegend.css';

const THEME_COLORS = {
  love:            '#f472b6',
  family:          '#fb923c',
  fatherhood:      '#fb923c',
  brotherhood:     '#e0915a',
  marriage:        '#f9a8d4',
  childhood:       '#fdba74',
  career:          '#60a5fa',
  craft:           '#38bdf8',
  filmmaking:      '#67e8f9',
  growth:          '#a78bfa',
  reflection:      '#c084fc',
  adventure:       '#2dd4bf',
  travel:          '#2dd4bf',
  greece:          '#2dd4bf',
  worldschooling:  '#5eead4',
  celebration:     '#fbbf24',
  friendship:      '#818cf8',
  nature:          '#34d399',
  food:            '#f97316',
  nostalgia:       '#d4a574',
  faith:           '#e2c6ff',
  home:            '#86efac',
  health:          '#4ade80',
  entrepreneurship:'#f59e0b',
  technology:      '#22d3ee',
};

/**
 * Floating color legend showing active themes.
 * Clickable: filters constellation to show only that theme's nodes.
 */
export default function ThemeLegend() {
  const storeNodes = useConstellationStore((s) => s.nodes);
  const filterEntity = useConstellationStore((s) => s.filterEntity);
  const setFilterEntity = useConstellationStore((s) => s.setFilterEntity);
  const clearFilter = useConstellationStore((s) => s.clearFilter);
  const [collapsed, setCollapsed] = useState(false);

  // Compute active themes with counts, deduplicating aliases
  const activeThemes = useMemo(() => {
    const counts = {};
    for (const node of storeNodes) {
      if (node.theme && THEME_COLORS[node.theme]) {
        counts[node.theme] = (counts[node.theme] || 0) + 1;
      }
    }

    // Deduplicate aliases: merge travel/greece into adventure, fatherhood into family
    const merged = {};
    const aliases = { travel: 'adventure', greece: 'adventure', worldschooling: 'adventure', fatherhood: 'family', brotherhood: 'family', marriage: 'family', childhood: 'family' };
    for (const [theme, count] of Object.entries(counts)) {
      const canonical = aliases[theme] || theme;
      merged[canonical] = (merged[canonical] || 0) + count;
    }

    return Object.entries(merged)
      .map(([theme, count]) => ({ theme, color: THEME_COLORS[theme], count }))
      .sort((a, b) => b.count - a.count);
  }, [storeNodes]);

  if (activeThemes.length === 0) return null;

  const handleClick = (theme) => {
    if (filterEntity?.type === 'theme' && filterEntity?.value === theme) {
      clearFilter();
    } else {
      setFilterEntity({ type: 'theme', value: theme });
    }
  };

  return (
    <div className="theme-legend">
      <button
        className="theme-legend__toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Show theme legend' : 'Hide theme legend'}
      >
        <span className="theme-legend__toggle-dots">
          {activeThemes.slice(0, 4).map((t) => (
            <span
              key={t.theme}
              className="theme-legend__mini-dot"
              style={{ backgroundColor: t.color }}
            />
          ))}
        </span>
        {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {!collapsed && (
        <div className="theme-legend__list">
          {activeThemes.map(({ theme, color, count }) => {
            const isActive =
              filterEntity?.type === 'theme' && filterEntity?.value === theme;
            return (
              <button
                key={theme}
                className={`theme-legend__item${isActive ? ' theme-legend__item--active' : ''}`}
                onClick={() => handleClick(theme)}
                title={`${theme} (${count} nodes)`}
              >
                <span
                  className="theme-legend__dot"
                  style={{ backgroundColor: color }}
                />
                <span className="theme-legend__label">{theme}</span>
                <span className="theme-legend__count">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
