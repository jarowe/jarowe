import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Sparkles, Network } from 'lucide-react';
import AdminGate from '../components/AdminGate';
import './Admin.css';

export default function AdminEditors() {
  return (
    <AdminGate>
      <EditorsInner />
    </AdminGate>
  );
}

const editors = [
  {
    label: 'Home Page Editor',
    desc: 'Globe visuals, Glint character, particles, atmosphere, and all home page live-tuning controls.',
    href: '/?editor=jarowe',
    icon: Globe,
    color: '#60a5fa',
  },
  {
    label: 'Constellation Editor',
    desc: 'Node layout, helix tuning, particle cloud, story panel, and constellation graph controls.',
    href: '/constellation?editor=constellation',
    icon: Network,
    color: '#a78bfa',
  },
];

function EditorsInner() {
  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</Link>
        <h1>
          <Sparkles size={20} style={{ verticalAlign: 'middle', marginRight: 8, opacity: 0.6 }} />
          Editors
        </h1>
        <p className="admin-subtitle">Live visual editors for tuning site experiences</p>
      </header>

      <section className="admin-section">
        <div className="admin-editors-grid">
          {editors.map((ed) => {
            const Icon = ed.icon;
            return (
              <a
                key={ed.href}
                href={ed.href}
                className="admin-editor-card admin-glass"
                style={{ '--hub-color': ed.color }}
              >
                <div className="admin-editor-icon-wrap">
                  <Icon size={28} />
                </div>
                <div className="admin-editor-info">
                  <span className="admin-editor-label">{ed.label}</span>
                  <span className="admin-editor-desc">{ed.desc}</span>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
