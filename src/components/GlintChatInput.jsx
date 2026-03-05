import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GlintChatInput.css';

const PLACEHOLDERS = [
  'Ask me anything...',
  "What's Jared working on?",
  'Tell me a secret...',
  'What can I explore?',
  'Know any easter eggs?',
];

export default function GlintChatInput({ onSend, disabled, onExpand }) {
  const [value, setValue] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef(null);

  // Cycle placeholders
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div className="glint-chat-input-wrap" onClick={(e) => e.stopPropagation()}>
      <form className="glint-chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="glint-chat-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 280))}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
        />
        <AnimatePresence mode="wait">
          {disabled ? (
            <motion.div
              key="dots"
              className="glint-chat-dots"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span /><span /><span />
            </motion.div>
          ) : (
            <motion.button
              key="send"
              type="submit"
              className="glint-chat-send"
              disabled={!value.trim()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
              title="Send"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M2.94 5.22a.75.75 0 011.12-.04L10 10.85l5.94-5.67a.75.75 0 111.04 1.08l-6.46 6.17a.75.75 0 01-1.04 0L3.02 6.26a.75.75 0 01-.08-1.04z" transform="rotate(-90 10 10)" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </form>
      {onExpand && (
        <button
          className="glint-chat-expand"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          title="Open full chat"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
            <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5.414l3.293 3.293a1 1 0 01-1.414 1.414L4 6.414V8a1 1 0 01-2 0V4zm13 12a1 1 0 01-1 1h-4a1 1 0 010-2h2.586l-3.293-3.293a1 1 0 011.414-1.414L16 13.586V12a1 1 0 012 0v4z" />
          </svg>
          Expand
        </button>
      )}
      <div className="glint-chat-ai-tag">
        <span className="glint-chat-sparkle">&#10024;</span> AI-powered
      </div>
    </div>
  );
}
