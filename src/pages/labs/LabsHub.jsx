import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, PenTool, Palette, Lightbulb, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../Starseed.css';
import './LabsHub.css';

const LABS_TOOLS = [
  {
    id: 'scratchpad',
    name: 'Scratchpad',
    description: 'Markdown editor. Jot ideas, draft plans, capture thoughts with rich formatting.',
    icon: PenTool,
    url: '/starseed/labs/scratchpad',
    status: 'active',
  },
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Infinite drawing surface. Sketch, diagram, map out ideas with freeform tools.',
    icon: Palette,
    url: '/starseed/labs/canvas',
    status: 'active',
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'AI-powered ideation. Collaborate with Glint to develop project briefs and creative direction.',
    icon: Lightbulb,
    url: null,
    status: 'coming-soon',
  },
];

export default function LabsHub() {
  return (
    <div className="starseed-shell" data-brand="starseed">
      <nav className="starseed-nav">
        <Link to="/starseed" className="starseed-escape">
          <ArrowLeft size={16} />
          <span>Back to Starseed</span>
        </Link>
        <div className="starseed-brand">
          <Sparkles size={18} className="starseed-logo-icon" />
          <span className="starseed-wordmark">Labs</span>
        </div>
      </nav>

      <motion.section className="labs-hub-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="labs-hub-title">Creation Tools</h1>
        <p className="labs-hub-subtitle">
          Write, sketch, and brainstorm. Your workspace inside the Starseed universe.
        </p>
      </motion.section>

      <section className="labs-hub-grid-section">
        <div className="labs-hub-grid">
          {LABS_TOOLS.map((tool, index) => {
            const Icon = tool.icon;
            const isActive = tool.status === 'active' && tool.url;

            const cardContent = (
              <motion.div
                className={`labs-hub-card ${!isActive ? 'labs-hub-card--disabled' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * (index + 1) }}
                key={tool.id}
              >
                <div className="labs-hub-card__icon">
                  <Icon size={32} />
                </div>
                <h3 className="labs-hub-card__name">{tool.name}</h3>
                <p className="labs-hub-card__desc">{tool.description}</p>
                {tool.status === 'coming-soon' && (
                  <span className="labs-hub-card__status">Coming soon</span>
                )}
                {isActive && (
                  <div className="labs-hub-card__action">
                    Open <ArrowRight size={14} />
                  </div>
                )}
              </motion.div>
            );

            return isActive ? (
              <Link to={tool.url} key={tool.id} className="labs-hub-card-link">
                {cardContent}
              </Link>
            ) : (
              <div key={tool.id}>{cardContent}</div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
