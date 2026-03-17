/**
 * ReleaseNav — minimal navigation for campaign routes.
 *
 * Shows: artist name/wordmark, campaign nav links, primary CTA.
 * Intentionally stripped-down compared to the main site Navbar.
 */

import { Link, useLocation } from 'react-router-dom';
import './ReleaseNav.css';

export default function ReleaseNav({ config, phase }) {
  const location = useLocation();
  const basePath = '/music/boy-in-the-bubble';
  const ctaSet = config.ctas[phase] ?? config.ctas['pre-single'];

  const navLinks = [
    { to: basePath,            label: 'Release' },
    { to: `${basePath}/artist`, label: 'Artist' },
    { to: `${basePath}/epk`,    label: 'EPK' },
  ];

  const isActive = (to) => {
    if (to === basePath) return location.pathname === basePath;
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="release-nav" aria-label="Release navigation">
      <div className="release-nav__inner">
        {/* Home escape hatch */}
        <Link to="/" className="release-nav__home" aria-label="Back to jarowe.com" title="Back to jarowe.com">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        {/* Wordmark */}
        <Link to={basePath} className="release-nav__wordmark">
          {config.artist.name}
        </Link>

        {/* Links */}
        <ul className="release-nav__links">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`release-nav__link ${isActive(to) ? 'release-nav__link--active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Primary CTA */}
        <a
          href={ctaSet.primary.url}
          className="release-nav__cta"
          target="_blank"
          rel="noopener noreferrer"
          data-utm-campaign={ctaSet.primary.utmCampaign}
        >
          {ctaSet.primary.label}
        </a>
      </div>
    </nav>
  );
}
