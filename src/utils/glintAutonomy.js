// Glint Autonomy System — Tier 3: Living Host Intelligence
// Pure JS module. Manages autonomous peek scheduling, event reactions,
// relationship memory, and cooldown management.

// ── Helpers ──
function log(...args) {
  const cfg = window.__prismConfig || {};
  if (cfg.autonomyDebugLog) console.log('[GlintAutonomy]', ...args);
}

function getCfg(key, fallback) {
  const cfg = window.__prismConfig || {};
  return cfg[key] ?? fallback;
}

// ── CooldownManager ──
class CooldownManager {
  constructor() {
    this.lastPeekTime = 0;         // global last peek timestamp
    this.triggerTimestamps = {};    // per-trigger type last peek timestamp
  }

  canPeek(triggerType) {
    const now = Date.now();
    const globalCooldown = getCfg('autonomyGlobalCooldown', 15) * 1000;
    const sameTriggerCooldown = getCfg('autonomySameTriggerCooldown', 45) * 1000;

    if (now - this.lastPeekTime < globalCooldown) {
      log(`Cooldown: global blocked (${Math.round((globalCooldown - (now - this.lastPeekTime)) / 1000)}s remaining)`);
      return false;
    }

    if (triggerType && this.triggerTimestamps[triggerType]) {
      if (now - this.triggerTimestamps[triggerType] < sameTriggerCooldown) {
        log(`Cooldown: same-trigger "${triggerType}" blocked (${Math.round((sameTriggerCooldown - (now - this.triggerTimestamps[triggerType])) / 1000)}s remaining)`);
        return false;
      }
    }

    return true;
  }

  recordPeek(triggerType) {
    const now = Date.now();
    this.lastPeekTime = now;
    if (triggerType) {
      this.triggerTimestamps[triggerType] = now;
    }
    log(`Cooldown: recorded peek "${triggerType}"`);
  }
}

// ── RelationshipMemory ──
const RELATIONSHIP_KEY = 'jarowe_glint_relationship';
const LEVEL_THRESHOLDS = [
  { level: 'best-friend', minXp: 1500 },
  { level: 'friend', minXp: 500 },
  { level: 'acquaintance', minXp: 100 },
  { level: 'stranger', minXp: 0 },
];

class RelationshipMemory {
  constructor() {
    this._load();
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(RELATIONSHIP_KEY) || 'null');
      if (saved) {
        this.totalInteractions = saved.totalInteractions || 0;
        this.lastTopic = saved.lastTopic || null;
        this.pagesVisited = new Set(saved.pagesVisited || []);
        this.lastSeen = saved.lastSeen || Date.now();
      } else {
        this._defaults();
      }
    } catch {
      this._defaults();
    }
  }

  _defaults() {
    this.totalInteractions = 0;
    this.lastTopic = null;
    this.pagesVisited = new Set();
    this.lastSeen = Date.now();
  }

  _save() {
    try {
      localStorage.setItem(RELATIONSHIP_KEY, JSON.stringify({
        totalInteractions: this.totalInteractions,
        lastTopic: this.lastTopic,
        pagesVisited: [...this.pagesVisited],
        lastSeen: this.lastSeen,
      }));
    } catch { /* localStorage full or unavailable */ }
  }

  getLevel() {
    const xp = parseInt(localStorage.getItem('jarowe_xp') || '0');
    for (const t of LEVEL_THRESHOLDS) {
      if (xp >= t.minXp) return t.level;
    }
    return 'stranger';
  }

  wasAwayLongTime() {
    return (Date.now() - this.lastSeen) > 5 * 60 * 1000; // 5 minutes
  }

  recordInteraction() {
    this.totalInteractions++;
    this.lastSeen = Date.now();
    this._save();
  }

  recordPageVisit(path) {
    this.pagesVisited.add(path);
    this.lastSeen = Date.now();
    this._save();
  }

  recordTopic(topic) {
    this.lastTopic = topic;
    this._save();
  }

  updateLastSeen() {
    this.lastSeen = Date.now();
    this._save();
  }
}

// ── XP Milestones ──
const XP_MILESTONES = [100, 250, 500, 1000, 1500];

function checkXpMilestone(previousXp, newXp) {
  for (const milestone of XP_MILESTONES) {
    if (previousXp < milestone && newXp >= milestone) {
      return milestone;
    }
  }
  return null;
}

// ── PeekScheduler ──
class PeekScheduler {
  constructor(autonomy) {
    this.autonomy = autonomy;
    this.idleTimer = null;
    this.periodicTimer = null;
    this.lastActivityTime = Date.now();
    this._activityHandler = this._onActivity.bind(this);
    this._activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
  }

  start() {
    // Activity detection (passive listeners)
    this._activityEvents.forEach(evt => {
      window.addEventListener(evt, this._activityHandler, { passive: true });
    });

    // First-visit welcome
    this._checkFirstVisit();

    // Start idle detection
    this._startIdleDetection();

    // Start periodic peeks
    this._schedulePeriodicPeek();

    log('PeekScheduler started');
  }

  stop() {
    this._activityEvents.forEach(evt => {
      window.removeEventListener(evt, this._activityHandler);
    });
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.periodicTimer) clearTimeout(this.periodicTimer);
    this.idleTimer = null;
    this.periodicTimer = null;
    log('PeekScheduler stopped');
  }

  _onActivity() {
    this.lastActivityTime = Date.now();
    // Reset idle timer
    this._startIdleDetection();
  }

  _checkFirstVisit() {
    // Initial hello is now handled by the guaranteed fallback in Home.jsx.
    // The autonomy scheduler still handles idle + periodic peeks.
    log('_checkFirstVisit: initial peek delegated to Home.jsx fallback');
  }

  _startIdleDetection() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!getCfg('autonomousPeeks', true)) return;

    const idleTime = getCfg('autonomyIdleTime', 30000);
    this.idleTimer = setTimeout(() => {
      if (this.autonomy._paused) return;
      const weight = getCfg('autonomyIdleWeight', 0.7);
      if (Math.random() < weight) {
        this.autonomy.triggerPeek('idle-nudge', {});
      }
      // Re-schedule idle detection
      this._startIdleDetection();
    }, idleTime);
  }

  _schedulePeriodicPeek() {
    if (this.periodicTimer) clearTimeout(this.periodicTimer);
    if (!getCfg('autonomousPeeks', true)) return;

    const minS = getCfg('autonomyPeriodicMin', 60);
    const maxS = getCfg('autonomyPeriodicMax', 120);
    const delay = (minS + Math.random() * (maxS - minS)) * 1000;

    this.periodicTimer = setTimeout(() => {
      if (!this.autonomy._paused && getCfg('autonomousPeeks', true)) {
        this.autonomy.triggerPeek('periodic', {});
      }
      // Re-schedule
      this._schedulePeriodicPeek();
    }, delay);

    log(`Periodic peek scheduled in ${Math.round(delay / 1000)}s`);
  }
}

// ── EventReactionManager ──
class EventReactionManager {
  constructor(autonomy) {
    this.autonomy = autonomy;
    this._handlers = {};
    this._lastKnownXp = parseInt(localStorage.getItem('jarowe_xp') || '0');
    this._scrollDebounceTimer = null;
  }

  start() {
    // XP gain
    this._handlers['add-xp'] = (e) => {
      if (!getCfg('autonomyEventReactions', true)) return;
      const weight = getCfg('autonomyXpWeight', 0.8);
      if (Math.random() > weight) return;

      const newXp = parseInt(localStorage.getItem('jarowe_xp') || '0');
      const milestone = checkXpMilestone(this._lastKnownXp, newXp);
      this._lastKnownXp = newXp;

      if (milestone) {
        this.autonomy.triggerPeek('xp-celebration', { milestone, xp: newXp });
      } else {
        this.autonomy.triggerPeek('xp-reaction', { xp: newXp, amount: e.detail?.amount });
      }
    };

    // Game complete
    this._handlers['game-complete'] = (e) => {
      if (!getCfg('autonomyEventReactions', true)) return;
      const weight = getCfg('autonomyGameWeight', 0.9);
      if (Math.random() > weight) return;

      const d = e.detail || {};
      const context = d.won ? 'game-win' : 'game-lose';
      this.autonomy.triggerPeek(context, { gameId: d.gameId, score: d.score, gameName: d.gameName });
    };

    // Music started
    this._handlers['music-started'] = () => {
      if (!getCfg('autonomyEventReactions', true)) return;
      const weight = getCfg('autonomyMusicWeight', 0.5);
      if (Math.random() > weight) return;
      this.autonomy.triggerPeek('music-reaction', {});
    };

    // Music stopped
    this._handlers['music-stopped'] = () => {
      if (!getCfg('autonomyEventReactions', true)) return;
      const weight = getCfg('autonomyMusicWeight', 0.5);
      if (Math.random() > weight) return;
      this.autonomy.triggerPeek('music-stop-reaction', {});
    };

    // Tab visibility change (welcome back)
    this._handlers['visibilitychange'] = () => {
      if (document.visibilityState !== 'visible') return;
      if (!getCfg('autonomyEventReactions', true)) return;
      const weight = getCfg('autonomyReturnWeight', 0.7);
      if (Math.random() > weight) return;
      if (this.autonomy.relationship.wasAwayLongTime()) {
        this.autonomy.triggerPeek('welcome-back', {});
        this.autonomy.relationship.updateLastSeen();
      }
    };

    // Scroll to bottom
    this._handlers['scroll'] = () => {
      if (this._scrollDebounceTimer) return;
      this._scrollDebounceTimer = setTimeout(() => {
        this._scrollDebounceTimer = null;
      }, 500);

      if (!getCfg('autonomyEventReactions', true)) return;
      const weight = getCfg('autonomyScrollWeight', 0.3);

      const scrolledToBottom =
        (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 100);
      if (scrolledToBottom && Math.random() < weight) {
        this.autonomy.triggerPeek('scroll-reaction', {});
      }
    };

    // Globe Glint flight start — set expression + trigger flight line peek
    this._handlers['globe-glint-flight-start'] = (e) => {
      if (!getCfg('autonomyEventReactions', true)) return;
      this.autonomy.triggerPeek('globe-flight', { destination: e.detail?.destination });
    };

    // Globe Glint arrival — trigger arrival peek with region-specific line
    this._handlers['globe-glint-arrived'] = (e) => {
      if (!getCfg('autonomyEventReactions', true)) return;
      const d = e.detail || {};
      this.autonomy.triggerPeek('globe-arrival', { region: d.region, name: d.name, destination: d.destination });
    };

    // Register listeners
    window.addEventListener('add-xp', this._handlers['add-xp']);
    window.addEventListener('game-complete', this._handlers['game-complete']);
    window.addEventListener('music-started', this._handlers['music-started']);
    window.addEventListener('music-stopped', this._handlers['music-stopped']);
    document.addEventListener('visibilitychange', this._handlers['visibilitychange']);
    window.addEventListener('scroll', this._handlers['scroll'], { passive: true });
    window.addEventListener('globe-glint-flight-start', this._handlers['globe-glint-flight-start']);
    window.addEventListener('globe-glint-arrived', this._handlers['globe-glint-arrived']);

    log('EventReactionManager started');
  }

  stop() {
    window.removeEventListener('add-xp', this._handlers['add-xp']);
    window.removeEventListener('game-complete', this._handlers['game-complete']);
    window.removeEventListener('music-started', this._handlers['music-started']);
    window.removeEventListener('music-stopped', this._handlers['music-stopped']);
    document.removeEventListener('visibilitychange', this._handlers['visibilitychange']);
    window.removeEventListener('scroll', this._handlers['scroll']);
    window.removeEventListener('globe-glint-flight-start', this._handlers['globe-glint-flight-start']);
    window.removeEventListener('globe-glint-arrived', this._handlers['globe-glint-arrived']);
    if (this._scrollDebounceTimer) clearTimeout(this._scrollDebounceTimer);
    this._handlers = {};
    log('EventReactionManager stopped');
  }
}

// ── Main GlintAutonomy Class ──
export class GlintAutonomy {
  constructor(config) {
    this.cooldown = new CooldownManager();
    this.relationship = new RelationshipMemory();
    this.scheduler = new PeekScheduler(this);
    this.events = new EventReactionManager(this);
    this._paused = false;
    this._running = false;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._paused = false;
    this.scheduler.start();
    this.events.start();
    this.relationship.recordPageVisit(window.location.pathname);
    log('GlintAutonomy started');
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    this.scheduler.stop();
    this.events.stop();
    this.relationship.updateLastSeen();
    log('GlintAutonomy stopped');
  }

  pause() {
    if (this._paused) return;
    this._paused = true;
    log('GlintAutonomy paused');
  }

  resume() {
    if (!this._paused) return;
    this._paused = false;
    log('GlintAutonomy resumed');
  }

  triggerPeek(triggerType, data = {}) {
    if (this._paused) {
      log(`triggerPeek "${triggerType}" suppressed (paused)`);
      return;
    }
    if (!getCfg('autonomyEnabled', true)) {
      log(`triggerPeek "${triggerType}" suppressed (disabled)`);
      return;
    }

    if (!this.cooldown.canPeek(triggerType)) return;

    this.cooldown.recordPeek(triggerType);
    this.relationship.recordInteraction();

    log(`triggerPeek: "${triggerType}"`, data);

    window.dispatchEvent(new CustomEvent('trigger-prism-peek', {
      detail: {
        autonomous: true,
        triggerType,
        context: triggerType,
        pinned: false,
        duration: 10000,
        ...data,
      }
    }));
  }
}

// ── Singleton ──
let _instance = null;

export function startGlintAutonomy(config) {
  if (_instance) {
    _instance.stop();
  }
  _instance = new GlintAutonomy(config);
  _instance.start();
  return _instance;
}

export function stopGlintAutonomy() {
  if (_instance) {
    _instance.stop();
    _instance = null;
  }
}

export function getGlintAutonomy() {
  return _instance;
}
