import './GlintFab.css';

export default function GlintFab({ onClick, isOpen, isPeeking }) {
  const cls = [
    'glint-fab',
    isOpen && 'glint-fab--open',
    isPeeking && 'glint-fab--peeking',
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} onClick={onClick} title={isOpen ? 'Close Glint chat' : 'Open Glint chat'} aria-label="Toggle Glint chat">
      <svg className="glint-fab-prism" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Diamond / prism shape */}
        <defs>
          <linearGradient id="prism-grad" x1="10" y1="4" x2="30" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="40%" stopColor="#7c3aed" />
            <stop offset="70%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <path d="M20 2 L36 20 L20 38 L4 20 Z" fill="url(#prism-grad)" opacity="0.85" />
        <path d="M20 2 L36 20 L20 38 L4 20 Z" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {/* Internal refraction lines */}
        <line x1="20" y1="2" x2="20" y2="38" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        <line x1="4" y1="20" x2="36" y2="20" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      </svg>
    </button>
  );
}
