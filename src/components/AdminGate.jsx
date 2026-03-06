import { useAuth } from '../context/AuthContext';

/**
 * Inline auth gate for admin pages. No redirects — just renders
 * the right UI for each state. Eliminates all race conditions.
 */
export default function AdminGate({ children }) {
  const auth = useAuth();
  const loading = auth?.loading ?? true;
  const isAdmin = auth?.isAdmin ?? false;
  const user = auth?.user ?? null;

  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div style={{ maxWidth: '400px', margin: '20vh auto 0', textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '2.5rem 2rem', backdropFilter: 'blur(12px)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem', color: '#fff' }}>Admin Access</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
            Sign in with an admin account to continue.
          </p>
          <button
            onClick={() => auth?.openAuthModal?.()}
            style={{ padding: '0.55rem 1.5rem', background: 'rgba(100,160,255,0.25)', color: 'rgb(140,190,255)', border: '1px solid rgba(100,160,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div style={{ maxWidth: '400px', margin: '20vh auto 0', textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '2.5rem 2rem', backdropFilter: 'blur(12px)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem', color: '#fff' }}>Not Authorized</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>
            Your account does not have admin access.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
