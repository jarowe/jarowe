import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, ArrowRight, PenTool, Palette, Wrench, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHoliday } from '../context/HolidayContext';
import { dailyPick } from '../utils/dailySeed';
import { getMoonPhase, getTimeOfDayPhase } from '../utils/astro';
import { DAILY_PROMPTS } from '../data/dailyPrompts';
import { GLINT_JOURNAL_ENTRIES } from '../data/glintJournal';
import './TodayRail.css';

// Featured constellation nodes for daily rotation (Phase 5 will pull from real data)
const FEATURED_NODES = [
  "Venice, 2024 -- a floating city of light.",
  "Valencia Film School, 2005 -- where it all started.",
  "Syros, Greece -- three months of sun and wonder.",
  "Elgato HQ, Munich -- the innovation lab.",
  "Doctrine Studios -- where Derek and I built everything.",
  "Videezy launch -- 3 million creatives served.",
  "Spain, 2025 -- worldschooling continues.",
  "SeaWorld Orlando -- VelociCoaster with the crew.",
  "Boy In The Bubble sessions -- music as medicine.",
  "BEAMY engine -- animation from the ground up.",
  "First Starseed project -- creative solutions, limitless.",
  "Rome with Maria -- eternal city, eternal love.",
  "Austria road trip -- alps and adventures.",
  "TwitchCon 2025 -- panels and possibilities.",
  "The health journey -- 150 lbs lost, still going.",
];

const MODE_ICONS = {
  write: PenTool,
  sketch: Palette,
  build: Wrench,
  dream: Cloud,
};

export default function TodayRail() {
  const { holiday } = useHoliday();

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
    const featuredNode = dailyPick(FEATURED_NODES, 'featured-node');
    const prompt = dailyPick(DAILY_PROMPTS, 'prompt');
    const moonPhase = getMoonPhase(now);
    const todPhase = getTimeOfDayPhase(now);
    return { dateStr, featuredNode, prompt, moonPhase, todPhase };
  }, []); // Stable for session -- re-mounts on page reload

  const ModeIcon = todayData.prompt ? MODE_ICONS[todayData.prompt.mode] || Sparkles : Sparkles;

  return (
    <section className="today-rail">
      <div className="today-rail__inner">

        {/* Card 1: Today State */}
        <motion.div
          className="today-card today-card--state"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
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
          <p className="today-card__featured">{todayData.featuredNode}</p>
          <Link to="/constellation" className="today-card__cta">
            Explore today <ArrowRight size={14} />
          </Link>
        </motion.div>

        {/* Card 2: Glint's Thought of the Day */}
        <motion.div
          className="today-card today-card--glint"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="today-card__glint-marker">
            <Sparkles size={14} />
            <span>Glint's Journal</span>
          </div>
          <p className="today-card__glint-line">{journalEntry}</p>
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
            transition={{ duration: 0.5, delay: 0.3 }}
          >
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
