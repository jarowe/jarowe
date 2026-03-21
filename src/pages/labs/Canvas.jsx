import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import '../Starseed.css';
import './Canvas.css';

const STORAGE_KEY = 'jarowe_labs_canvas';

function loadSavedScene() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Reset collaborators Map -- JSON.stringify breaks Maps (Pitfall 6 from research)
    if (parsed.appState) {
      parsed.appState.collaborators = new Map();
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function Canvas() {
  const [initialData] = useState(loadSavedScene);
  const saveTimeout = useRef(null);

  const handleChange = useCallback((elements, appState) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        // Persist only essential state -- not transient UI state (Pitfall from research)
        const toSave = {
          elements,
          appState: {
            theme: appState.theme,
            viewBackgroundColor: appState.viewBackgroundColor,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        console.warn('Canvas: localStorage write failed', e);
      }
    }, 2000);
  }, []);

  return (
    <div className="starseed-shell" data-brand="starseed">
      <nav className="starseed-nav">
        <Link to="/starseed/labs" className="starseed-escape">
          <ArrowLeft size={16} />
          <span>Back to Labs</span>
        </Link>
        <div className="starseed-brand">
          <Sparkles size={18} className="starseed-logo-icon" />
          <span className="starseed-wordmark">Canvas</span>
        </div>
      </nav>

      <div className="canvas-editor-container">
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: {
              toggleTheme: false,
            },
          }}
        />
      </div>
    </div>
  );
}
