import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, PenTool, Palette, Lightbulb } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import './Starseed.css';

export default function Starseed() {
  const navigate = useNavigate();

  return (
    <div className="starseed-shell" data-brand="starseed">
      {/* Starseed internal nav */}
      <nav className="starseed-nav">
        <Link to="/" className="starseed-escape">
          <ArrowLeft size={16} />
          <span>Back to jarowe.com</span>
        </Link>
        <div className="starseed-brand">
          <Sparkles size={18} className="starseed-logo-icon" />
          <span className="starseed-wordmark">Starseed</span>
        </div>
      </nav>

      {/* Hero section */}
      <motion.section className="starseed-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="starseed-title">
          Where ideas<br />become real.
        </h1>
        <p className="starseed-subtitle">
          Creative studio. Tools. Experiments. A launchpad for what's next.
        </p>
      </motion.section>

      {/* Project grid -- placeholder slots for Phase 5 project cards */}
      <section className="starseed-projects">
        <h2 className="starseed-section-heading">Active Projects</h2>
        <div className="starseed-project-grid">
          {/* BEAMY */}
          <motion.div className="starseed-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate('/projects/beamy')}
          >
            <div className="starseed-card__icon"><PenTool size={28} /></div>
            <h3>BEAMY</h3>
            <p>Simply powerful animation engine. C++ core, React frontend.</p>
            <div className="starseed-card__tags">
              <span className="starseed-tag">Animation</span>
              <span className="starseed-tag">Desktop</span>
            </div>
          </motion.div>

          {/* AMINA */}
          <motion.div className="starseed-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="starseed-card__icon"><Lightbulb size={28} /></div>
            <h3>AMINA</h3>
            <p>AI-native creative assistant. Idea capture meets intelligent expansion.</p>
            <div className="starseed-card__tags">
              <span className="starseed-tag">AI</span>
              <span className="starseed-tag">Creative</span>
            </div>
            <span className="starseed-card__status">Coming soon</span>
          </motion.div>

          {/* Starseed Labs */}
          <motion.div className="starseed-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="starseed-card__icon"><Palette size={28} /></div>
            <h3>Starseed Labs</h3>
            <p>Scratchpad. Canvas. Brainstorm. Creation tools for the curious.</p>
            <div className="starseed-card__tags">
              <span className="starseed-tag">Tools</span>
              <span className="starseed-tag">Creative</span>
            </div>
            <span className="starseed-card__status">Coming soon</span>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="starseed-footer-cta">
        <p>Starseed is a satellite of <Link to="/" className="starseed-link">jarowe.com</Link> -- a living creative world.</p>
      </section>
    </div>
  );
}
