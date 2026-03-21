import { useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { useAutoSave } from '../../hooks/useAutoSave';
import { SCRATCHPAD_KEY as STORAGE_KEY } from '../../utils/storageKeys';
import '../Starseed.css';
import './Scratchpad.css';

function MilkdownEditor({ defaultValue, onContentChange }) {
  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue,
      features: {
        [Crepe.Feature.CodeMirror]: false,  // Reduces bundle size significantly
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.ImageBlock]: false,
      },
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown) {
          onContentChange(markdown);
        }
      });
    });

    return crepe;
  }, []);

  return <Milkdown />;
}

export default function Scratchpad() {
  const [searchParams] = useSearchParams();
  const promptParam = searchParams.get('prompt');
  const { save } = useAutoSave(STORAGE_KEY, 2000);

  // Load initial content: existing draft > prompt param > default
  const initialContent = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;  // Existing draft takes priority (query-param hygiene)
    } catch {}
    if (promptParam) return `# Creative Prompt\n\n${promptParam}\n\n---\n\n`;
    return '# Untitled\n\nStart writing...';
  }, []);

  const handleContentChange = useCallback((markdown) => {
    save(markdown);
  }, [save]);

  return (
    <div className="starseed-shell" data-brand="starseed">
      <nav className="starseed-nav">
        <Link to="/starseed/labs" className="starseed-escape">
          <ArrowLeft size={16} />
          <span>Back to Labs</span>
        </Link>
        <div className="starseed-brand">
          <Sparkles size={18} className="starseed-logo-icon" />
          <span className="starseed-wordmark">Scratchpad</span>
        </div>
      </nav>

      <div className="scratchpad-editor-container">
        <MilkdownProvider>
          <MilkdownEditor
            defaultValue={initialContent}
            onContentChange={handleContentChange}
          />
        </MilkdownProvider>
      </div>
    </div>
  );
}
