import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, ArrowRight, PenTool, Palette, Wrench, Cloud, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useHoliday } from '../context/HolidayContext';
import { dailyPick } from '../utils/dailySeed';
import { getMoonPhase, getTimeOfDayPhase } from '../utils/astro';
import { DAILY_PROMPTS } from '../data/dailyPrompts';
import { GLINT_JOURNAL_ENTRIES } from '../data/glintJournal';
import { FEATURED_MOMENTS, CATEGORY_THEMES } from '../data/featuredMoments';
import { navigateWithTransition } from '../utils/viewTransitions';
import './TodayRail.css';

const MODE_ICONS = {
  write: PenTool,
  sketch: Palette,
  build: Wrench,
  dream: Cloud,
};

/**
 * Pick a featured constellation moment based on today's holiday category.
 * If the holiday has a direct nodeId, use that. Otherwise map category → themes → pick.
 */
function pickFeaturedMoment(holiday) {
  if (!holiday) return dailyPick(FEATURED_MOMENTS, 'featured-moment');

  // Direct nodeId mapping — find the matching moment
  if (holiday.nodeId) {
    const direct = FEATURED_MOMENTS.find(m => m.id === holiday.nodeId);
    if (direct) return direct;
  }

  // Map holiday category to constellation themes
  const themes = CATEGORY_THEMES[holiday.category] || ['craft', 'career'];
  const matching = FEATURED_MOMENTS.filter(m => themes.includes(m.theme));

  if (matching.length === 0) return dailyPick(FEATURED_MOMENTS, 'featured-moment');
  return dailyPick(matching, `featured-${holiday.category}`);
}

// Creative artwork pool — random on each hover
const CREATIVE_ARTWORKS = [
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=60',
  'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&q=60',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=60',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=600&q=60',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=60',
  'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=600&q=60',
  'https://images.unsplash.com/photo-1579547945413-497e1b99dac0?w=600&q=60',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=600&q=60',
];

export default function TodayRail() {
  const { holiday } = useHoliday();
  const navigate = useNavigate();
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState(CREATIVE_ARTWORKS[0]);

  // Randomize artwork on each hover
  const handlePromptHover = useCallback(() => {
    const idx = Math.floor(Math.random() * CREATIVE_ARTWORKS.length);
    setArtworkUrl(CREATIVE_ARTWORKS[idx]);
  }, []);

  // Journal entry: start with deterministic fallback, upgrade to AI if available
  const [journalEntry, setJournalEntry] = useState(() => {
    return dailyPick(GLINT_JOURNAL_ENTRIES, 'glint-journal');
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/glint-journal')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.entry) {
          setJournalEntry(data.entry);
        }
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, []);

  const todayData = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const prompt = dailyPick(DAILY_PROMPTS, 'prompt');
    const moonPhase = getMoonPhase(now);
    const todPhase = getTimeOfDayPhase(now);
    const featured = pickFeaturedMoment(holiday);
    return { dateStr, prompt, moonPhase, todPhase, featured };
  }, [holiday]);

  const ModeIcon = todayData.prompt ? MODE_ICONS[todayData.prompt.mode] || Sparkles : Sparkles;

  const handleExplore = () => {
    if (todayData.featured) {
      navigateWithTransition(navigate, `/constellation/${todayData.featured.id}`);
    }
  };

  return (
    <section className="today-rail">
      <div className="today-rail__inner">

        {/* Card 1: Today — Day + Featured Constellation Moment */}
        <motion.div
          className="today-card today-card--state"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="today-card__date">
            <Calendar size={14} className="today-card__date-icon" />
            <span>{todayData.dateStr}</span>
          </div>
          {holiday && holiday.name && (
            <div className="today-card__holiday">
              <span className="today-card__emoji">{holiday.emoji}</span>
              <span>{holiday.name}</span>
            </div>
          )}
          {holiday && holiday.greeting && (
            <p className="today-card__greeting">{holiday.greeting}</p>
          )}

          {/* Featured Constellation Moment — with blurred media preview on hover */}
          {todayData.featured && (
            <div className="today-card__moment">
              {todayData.featured.media && (
                <div
                  className="today-card__moment-bg"
                  style={{ backgroundImage: `url(${todayData.featured.media.startsWith('http') ? todayData.featured.media : `${import.meta.env.BASE_URL}${todayData.featured.media}`})` }}
                />
              )}
              <div className="today-card__moment-badge">
                <Star size={10} />
                <span>Featured Moment</span>
              </div>
              <p className="today-card__moment-title">{todayData.featured.title}</p>
              <span className="today-card__moment-epoch">{todayData.featured.epoch}</span>
            </div>
          )}

          <button className="today-card__cta today-card__cta--explore" onClick={handleExplore}>
            Explore this moment <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Card 2: Glint's Thought of the Day */}
        <motion.div
          className="today-card today-card--glint"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="today-card__glint-marker">
            <Sparkles size={14} />
            <span>Glint's Journal</span>
          </div>
          <p className={`today-card__glint-line${journalExpanded ? ' expanded' : ''}`}>{journalEntry}</p>
          {!journalExpanded && journalEntry.length > 120 && (
            <button className="today-card__glint-expand" onClick={() => setJournalExpanded(true)}>
              ...read more
            </button>
          )}
          <button
            className="today-card__cta today-card__cta--secondary"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('glint-open'));
            }}
          >
            Ask Glint <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Card 3: Creative Prompt */}
        {todayData.prompt && (
          <motion.div
            className="today-card today-card--prompt"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onMouseEnter={handlePromptHover}
          >
            <div
              className="today-card__artwork"
              style={{ backgroundImage: `url(${artworkUrl})` }}
            />
            <div className="today-card__mode-chip" data-mode={todayData.prompt.mode}>
              <ModeIcon size={12} />
              <span>{todayData.prompt.mode}</span>
            </div>
            <p className="today-card__prompt-text">{todayData.prompt.text}</p>
            <Link
              to={`/starseed/labs/scratchpad?prompt=${encodeURIComponent(todayData.prompt.text)}`}
              className="today-card__cta today-card__cta--starseed"
            >
              Start in Starseed <ArrowRight size={14} />
            </Link>
          </motion.div>
        )}

      </div>
    </section>
  );
}
