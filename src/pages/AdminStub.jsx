import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAdminGuard } from '../hooks/useAdminGuard';
import './Admin.css';

const STUBS = {
  users: {
    title: 'User Management',
    desc: 'View registered users, manage admin roles, review activity and cloud sync data.',
  },
  content: {
    title: 'Content Manager',
    desc: 'Edit constellation nodes, manage holiday calendar entries, and curate pipeline output.',
  },
};

export default function AdminStub({ page }) {
  const { allowed, loading } = useAdminGuard();
  const stub = STUBS[page] || { title: 'Coming Soon', desc: '' };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Checking access...</div>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</Link>
        <h1>{stub.title}</h1>
        <p className="admin-subtitle">Coming soon</p>
      </header>

      <section className="admin-section admin-glass" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto' }}>
          {stub.desc}
        </p>
      </section>
    </div>
  );
}
