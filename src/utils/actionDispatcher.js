// Action Dispatcher — shared tool definitions, narration, and event dispatch
// Used by both Glint AI chat and Cmd+K palette to execute site actions

export const TOOLS = {
  navigate: {
    schema: {
      type: 'function',
      function: {
        name: 'navigate',
        description: 'Navigate the visitor to a specific page on jarowe.com. Use when the visitor asks to go somewhere, visit a page, or see a specific section.',
        parameters: {
          type: 'object',
          properties: {
            destination: {
              type: 'string',
              enum: ['/', '/constellation', '/universe', '/garden', '/now', '/favorites', '/vault', '/starseed', '/profile'],
              description: 'The route path to navigate to',
            },
          },
          required: ['destination'],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    narrations: [
      "Ooh, let me refract you over there...",
      "One prismatic leap, coming right up!",
      "Follow my light!",
      "Bending the spectrum your way...",
      "Let me scatter us through the light...",
      "Refracting in 3... 2... 1...",
    ],
    expression: 'excited',
  },

  launch_game: {
    schema: {
      type: 'function',
      function: {
        name: 'launch_game',
        description: 'Launch a mini-game for the visitor. Use when they ask to play a game, want entertainment, or are bored.',
        parameters: {
          type: 'object',
          properties: {
            game_id: {
              type: 'string',
              enum: [
                'emoji-slots', 'fortune-cookie', 'whack-a-mole',
                'memory-match', 'word-scramble', 'snake', 'breakout',
                'typing-race', 'pizza-maker', 'mini-golf',
                'gacha-pull', 'scratch-card', 'coin-toss', 'lucky-wheel',
                'bubble-pop', 'tower-stack', 'reaction-test', 'color-flood',
                'catch-dodge', 'pattern-recall',
              ],
              description: 'The game to launch',
            },
          },
          required: ['game_id'],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    narrations: [
      "Time to play! Let me load that up...",
      "Ooh, game time! I love watching...",
      "Let's fire this one up!",
      "Loading some fun into the spectrum...",
      "One game, coming right through the prism!",
      "Let me refract some entertainment your way...",
    ],
    expression: 'mischief',
  },

  control_music: {
    schema: {
      type: 'function',
      function: {
        name: 'control_music',
        description: 'Control music playback. Use when the visitor asks to play music, pause, skip, or stop music.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['play', 'pause', 'next'],
              description: 'The playback action to perform',
            },
          },
          required: ['action'],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    narrations: [
      "Let me tune those wavelengths...",
      "Adjusting the sound spectrum...",
      "One frequency shift, coming up...",
      "Tweaking the audio prism...",
      "Let me refract those sound waves...",
    ],
    expression: 'happy',
  },

  show_daily: {
    schema: {
      type: 'function',
      function: {
        name: 'show_daily',
        description: "Show today's daily content including holiday, creative prompt, and Glint journal entry. Use when the visitor asks what's new today or what's happening.",
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    narrations: [
      "Let me check what the light brought today...",
      "Scanning today's wavelengths...",
      "Ooh, let me see what's happening in the spectrum...",
      "Reading today's refraction patterns...",
      "Let me peek at the daily light show...",
    ],
    expression: 'curious',
  },
};

/**
 * Get all tool schemas for OpenAI function calling.
 * @returns {Array} Array of OpenAI tool schema objects
 */
export function getToolSchemas() {
  return Object.values(TOOLS).map(t => t.schema);
}

/**
 * Get a random narration line + expression for a tool.
 * @param {string} toolName - The tool name (e.g. 'navigate')
 * @returns {{ text: string, expression: string } | null}
 */
export function getNarration(toolName) {
  const tool = TOOLS[toolName];
  if (!tool) return null;
  const lines = tool.narrations;
  return {
    text: lines[Math.floor(Math.random() * lines.length)],
    expression: tool.expression,
  };
}

/**
 * Dispatch a glint-action CustomEvent on the window.
 * @param {string} action - The action name (e.g. 'navigate', 'launch_game')
 * @param {object} params - Action parameters (e.g. { destination: '/garden' })
 */
export function dispatch(action, params = {}) {
  window.dispatchEvent(new CustomEvent('glint-action', {
    detail: { action, params },
  }));
}

/**
 * Get all registered tool names.
 * @returns {string[]}
 */
export function getToolNames() {
  return Object.keys(TOOLS);
}
