import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GlintChatPanel.css';

const STARTER_QUESTIONS = [
  "What is this site?",
  "Tell me about Jared",
  "What can I explore?",
  "Know any secrets?",
  "What are you, Glint?",
  "What's the coolest thing here?",
];

// Pick 4 random starters (shuffled)
function getStarters() {
  const shuffled = [...STARTER_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export default function GlintChatPanel({
  open,
  onClose,
  messages,
  onSend,
  streaming,
  streamText,
  messageLimit,
}) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [starters] = useState(getStarters);
  const prevMsgCount = useRef(0);

  // Auto-scroll on new message or stream update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: prevMsgCount.current > 0 ? 'smooth' : 'auto',
      });
    }
    prevMsgCount.current = messages.length;
  }, [messages, streamText]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const trimmed = input.value.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    input.value = '';
  };

  // Strip expression and suggest tags for display
  const cleanText = (text) =>
    text?.replace(/\[expression:\w+\]/g, '').replace(/\[suggest:[^\]]*\]/g, '').trim();

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="glint-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="glint-chat-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="glint-panel-header">
              <div className="glint-panel-avatar">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <polygon
                    points="12,2 22,20 2,20"
                    fill="url(#prismGrad)"
                    stroke="rgba(124,58,237,0.5)"
                    strokeWidth="1"
                  />
                  <defs>
                    <linearGradient id="prismGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#f472b6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="glint-panel-title">Glint</span>
              <span className="glint-panel-badge">AI</span>
              {messageLimit > 0 && messages.length > 0 && (
                <span className="glint-panel-msg-count">
                  {messages.filter(m => m.role === 'user').length}/{messageLimit}
                </span>
              )}
              <span className="glint-panel-shortcut" title="Toggle with Ctrl+K">
                <kbd>Ctrl</kbd>+<kbd>K</kbd>
              </span>
              <button className="glint-panel-close" onClick={onClose} title="Close (Esc)">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="glint-panel-messages" ref={scrollRef}>
              {/* Empty state with welcome + starter pills */}
              {isEmpty && (
                <div className="glint-panel-empty">
                  <motion.div
                    className="glint-panel-empty-prism"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                  >
                    &#9670;
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    Hey! I'm Glint. Ask me anything.
                  </motion.p>
                  <motion.p
                    className="glint-panel-empty-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    I know this site inside and out, and I love to chat about Jared's work, hidden features, and creative ideas.
                  </motion.p>
                  <motion.div
                    className="glint-panel-starters"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {starters.map((q, i) => (
                      <motion.button
                        key={q}
                        className="glint-starter-pill"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.08 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSend(q)}
                      >
                        {q}
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* Message history */}
              {messages.map((msg, i) => (
                <motion.div
                  key={`${msg.timestamp}-${i}`}
                  className={`glint-panel-msg ${msg.role === 'user' ? 'glint-msg-user' : 'glint-msg-assistant'}`}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  {msg.role === 'assistant' && (
                    <div className="glint-msg-avatar-mini">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                        <polygon points="12,3 20,19 4,19" fill="url(#prismGrad)" />
                      </svg>
                    </div>
                  )}
                  <div className="glint-msg-bubble">
                    {cleanText(msg.content)}
                  </div>
                  {msg.timestamp && (
                    <div className="glint-msg-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Streaming message */}
              {streaming && streamText && (
                <motion.div
                  className="glint-panel-msg glint-msg-assistant"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="glint-msg-avatar-mini">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                      <polygon points="12,3 20,19 4,19" fill="url(#prismGrad)" />
                    </svg>
                  </div>
                  <div className="glint-msg-bubble glint-msg-streaming">
                    {cleanText(streamText)}
                    <span className="glint-stream-cursor" />
                  </div>
                </motion.div>
              )}

              {/* Thinking indicator */}
              {streaming && !streamText && (
                <motion.div
                  className="glint-panel-msg glint-msg-assistant"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="glint-msg-avatar-mini">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                      <polygon points="12,3 20,19 4,19" fill="url(#prismGrad)" />
                    </svg>
                  </div>
                  <div className="glint-msg-bubble glint-msg-thinking">
                    <span className="glint-think-dot" />
                    <span className="glint-think-dot" />
                    <span className="glint-think-dot" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <form className="glint-panel-input-bar" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                className="glint-panel-input"
                type="text"
                placeholder="Message Glint..."
                maxLength={280}
                disabled={streaming}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="submit"
                className="glint-panel-send"
                disabled={streaming}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M2.94 5.22a.75.75 0 011.12-.04L10 10.85l5.94-5.67a.75.75 0 111.04 1.08l-6.46 6.17a.75.75 0 01-1.04 0L3.02 6.26a.75.75 0 01-.08-1.04z" transform="rotate(-90 10 10)" />
                </svg>
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
