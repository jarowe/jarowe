import { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { Globe, Gamepad2, Music, Compass, Sparkles, Search } from 'lucide-react';
import { GAMES } from '../data/gameRegistry';
import { dispatch } from '../utils/actionDispatcher';
import './CommandPalette.css';

const PAGES = [
  { label: 'Home', destination: '/', icon: Globe },
  { label: 'Constellation', destination: '/constellation', icon: Sparkles },
  { label: 'Universe', destination: '/universe', icon: Globe },
  { label: 'Garden', destination: '/garden', icon: Compass },
  { label: 'Now', destination: '/now', icon: Compass },
  { label: 'Favorites', destination: '/favorites', icon: Sparkles },
  { label: 'Vault', destination: '/vault', icon: Compass },
  { label: 'Starseed', destination: '/starseed', icon: Sparkles },
];

const ACTIONS = [
  { label: 'Play Music', action: 'control_music', params: { action: 'play' } },
  { label: 'Pause Music', action: 'control_music', params: { action: 'pause' } },
  { label: 'Next Track', action: 'control_music', params: { action: 'next' } },
  { label: "What's New Today?", action: 'show_daily', params: {} },
];

export default function CommandPalette({ open, onOpenChange }) {
  const [constellationNodes, setConstellationNodes] = useState([]);
  const [nodesLoaded, setNodesLoaded] = useState(false);

  // Derive game list from registry, excluding variants
  const games = useMemo(() => {
    return Object.entries(GAMES)
      .filter(([, game]) => !game.variant)
      .map(([key, game]) => ({ label: game.name, gameId: key }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Lazy-load constellation nodes on first open
  useEffect(() => {
    if (!open || nodesLoaded) return;
    setNodesLoaded(true);

    fetch(`${import.meta.env.BASE_URL}data/constellation.graph.json`)
      .then((r) => r.json())
      .then((data) => {
        if (data.nodes && Array.isArray(data.nodes)) {
          const nodes = data.nodes
            .filter((n) => n.id && n.title)
            .map((n) => ({ id: n.id, title: n.title }));
          setConstellationNodes(nodes);
        }
      })
      .catch(() => {
        // Silently fail -- constellation category simply won't appear
      });
  }, [open, nodesLoaded]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Palette"
    >
      <Command.Input placeholder="Search pages, games, actions..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Pages">
          {PAGES.map((p) => (
            <Command.Item
              key={p.destination}
              onSelect={() => {
                dispatch('navigate', { destination: p.destination });
                onOpenChange(false);
              }}
            >
              <p.icon size={16} />
              <span>{p.label}</span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Games">
          {games.map((g) => (
            <Command.Item
              key={g.gameId}
              onSelect={() => {
                dispatch('launch_game', { game_id: g.gameId });
                onOpenChange(false);
              }}
            >
              <Gamepad2 size={16} />
              <span>{g.label}</span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Actions">
          {ACTIONS.map((a) => (
            <Command.Item
              key={a.label}
              onSelect={() => {
                dispatch(a.action, a.params);
                onOpenChange(false);
              }}
            >
              <Music size={16} />
              <span>{a.label}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {constellationNodes.length > 0 && (
          <Command.Group heading="Constellation">
            {constellationNodes.slice(0, 50).map((n) => (
              <Command.Item
                key={n.id}
                value={n.title}
                onSelect={() => {
                  dispatch('navigate', {
                    destination: `/constellation/${n.id}`,
                  });
                  onOpenChange(false);
                }}
              >
                <Sparkles size={16} />
                <span>{n.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
