import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, PenTool, Palette, Lightbulb, LayoutGrid, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { STARSEED_PROJECTS } from '../data/starseedProjects';
import { playClickSound, playHoverSound } from '../utils/sounds';
import './Starseed.css';

const ICON_MAP = { PenTool, Lightbulb, LayoutGrid, Palette };

export default function Starseed() {
  const navigate = useNavigate();
  const gridRef = useRef();

  // 3D Tilt — same as Workshop
  useEffect(() => {
    const cells = gridRef.current?.querySelectorAll('.starseed-card:not(.starseed-card--disabled)');
    if (!cells) return;

    const handleMouseMove = (e) => {
      const cell = e.currentTarget;
      const rect = cell.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      cell.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      cell.style.zIndex = 10;
    };

    const handleMouseLeave = (e) => {
      const cell = e.currentTarget;
      cell.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      void cell.offsetHeight;
      cell.style.transform = '';
      cell.style.zIndex = '';
    };

    const handleMouseEnter = (e) => {
      const cell = e.currentTarget;
      cell.style.transition = 'none';
      playHoverSound();
    };

    cells.forEach(cell => {
      cell.addEventListener('mousemove', handleMouseMove);
      cell.addEventListener('mouseleave', handleMouseLeave);
      cell.addEventListener('mouseenter', handleMouseEnter);
    });

    return () => {
      cells.forEach(cell => {
        cell.removeEventListener('mousemove', handleMouseMove);
        cell.removeEventListener('mouseleave', handleMouseLeave);
        cell.removeEventListener('mouseenter', handleMouseEnter);
      });
    };
  }, []);

  return (
    <div className="starseed-shell" data-brand="starseed">
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

      <motion.section className="starseed-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="starseed-title">
          Where ideas<br />become real.
        </h1>
        <p className="starseed-subtitle">
          Creative studio. Tools. Experiments. A launchpad for what's possible.
        </p>
      </motion.section>

      <section className="starseed-projects">
        <h2 className="starseed-section-heading">Active Projects</h2>
        <div className="starseed-project-grid" ref={gridRef}>
          {STARSEED_PROJECTS.map((project, index) => {
            const Icon = ICON_MAP[project.icon];
            const isDisabled = !project.url;

            const handleClick = () => {
              if (!project.url) return;
              playClickSound();
              if (project.url.startsWith('http')) {
                window.open(project.url, '_blank');
              } else {
                navigate(project.url);
              }
            };

            return (
              <motion.div
                key={project.id}
                className={`starseed-card${isDisabled ? ' starseed-card--disabled' : ''}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * (index + 1), ease: [0.175, 0.885, 0.32, 1.275] }}
                onClick={project.url ? handleClick : undefined}
                role={project.url ? 'link' : undefined}
                tabIndex={project.url ? 0 : undefined}
                onKeyDown={project.url && ((e) => e.key === 'Enter' && handleClick())}
              >
                {/* Workshop-style bg image reveal */}
                <div
                  className="starseed-card__bg"
                  style={{ backgroundImage: `url(${project.bgImage})` }}
                />
                <div className="starseed-card__content">
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
                  {project.url && (
                    <div className="starseed-card__launch">
                      Launch <ArrowRight size={14} />
                    </div>
                  )}
                </div>
                {project.status === 'coming-soon' && (
                  <span className="starseed-card__status">Coming soon</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

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

      <section className="starseed-footer-cta">
        <p>Starseed is a satellite of <Link to="/" className="starseed-link">jarowe.com</Link> — a living creative world.</p>
      </section>
    </div>
  );
}
