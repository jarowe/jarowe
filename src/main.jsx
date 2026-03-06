import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function isStaleChunkError(error) {
  const msg = error?.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[JAROWE] React crash:', error, info.componentStack);
    // Auto-reload on stale chunk errors (happens after new deployments)
    if (isStaleChunkError(error)) {
      const key = 'jarowe_chunk_reload';
      const last = sessionStorage.getItem(key);
      // Only auto-reload once per session to avoid infinite loops
      if (!last || Date.now() - parseInt(last, 10) > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return;
      }
    }
  }
  render() {
    if (this.state.error) {
      const isChunkError = isStaleChunkError(this.state.error);
      return (
        <div style={{ padding: '2rem', color: '#fff', fontFamily: 'Inter, sans-serif', background: '#0c0a1c', minHeight: '100vh' }}>
          <h1 style={{ color: '#f472b6' }}>{isChunkError ? 'New version available!' : 'Something broke!'}</h1>
          <p style={{ color: '#94a3b8' }}>
            {isChunkError
              ? 'The site was just updated. Click reload to get the latest version.'
              : 'The app hit an error. Try refreshing the page.'}
          </p>
          {!isChunkError && (
            <pre style={{ color: '#fbbf24', fontSize: '0.8rem', whiteSpace: 'pre-wrap', marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              {this.state.error.message}
            </pre>
          )}
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
