import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, PenTool, Palette, Lightbulb, LayoutGrid, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { STARSEED_PROJECTS } from '../data/starseedProjects';
import './Starseed.css';

const ICON_MAP = { PenTool, Lightbulb, LayoutGrid, Palette };

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
        <Link to="/starseed/labs" className="starseed-nav-link">Labs</Link>
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

      {/* Project grid -- data-driven from starseedProjects.js */}
      <section className="starseed-projects">
        <h2 className="starseed-section-heading">Active Projects</h2>
        <div className="starseed-project-grid">
          {STARSEED_PROJECTS.map((project, index) => {
            const Icon = ICON_MAP[project.icon];
            const isDisabled = !project.url;
            const isExternal = project.url && project.url.startsWith('http');

            const handleClick = () => {
              if (!project.url) return;
              if (isExternal) {
                window.open(project.url, '_blank');
              } else {
                navigate(project.url);
              }
            };

            const handleKeyDown = (e) => {
              if (e.key === 'Enter' && project.url) {
                handleClick();
              }
            };

            return (
              <motion.div
                key={project.id}
                className={`starseed-card${isDisabled ? ' starseed-card--disabled' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * (index + 1) }}
                onClick={project.url ? handleClick : undefined}
                role={project.url ? 'link' : undefined}
                tabIndex={project.url ? 0 : undefined}
                onKeyDown={project.url ? handleKeyDown : undefined}
              >
                <div className="starseed-card__icon">
                  {Icon && <Icon size={28} />}
                </div>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <div className="starseed-card__tags">
                  {project.tags.map((tag) => (
                    <span key={tag} className="starseed-tag">{tag}</span>
                  ))}
                </div>
                {project.status === 'coming-soon' && (
                  <span className="starseed-card__status">Coming soon</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Contact section */}
      <section className="starseed-contact">
        <h2 className="starseed-section-heading">Work With Starseed</h2>
        <p className="starseed-contact__text">
          Have a project idea? Need creative strategy, animation, or AI integration?
        </p>
        <a href="mailto:jared@starseed.llc" className="starseed-contact__link">
          <Mail size={16} />
          <span>jared@starseed.llc</span>
        </a>
      </section>

      {/* Footer CTA */}
      <section className="starseed-footer-cta">
        <p>Starseed is a satellite of <Link to="/" className="starseed-link">jarowe.com</Link> -- a living creative world.</p>
      </section>
    </div>
  );
}
