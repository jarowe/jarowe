// Server-side tool schemas for Glint AI chat OpenAI function calling
// Duplicated from src/utils/actionDispatcher.js (intentional — API runs on Edge, client in browser)
// Only contains schemas, NOT narration/expression data (client-only)

/**
 * Get OpenAI function calling tool schemas for Glint.
 * @returns {Array} Array of tool objects for the OpenAI API tools parameter
 */
export function getToolSchemas() {
  return [
    {
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
    {
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
    {
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
    {
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
  ];
}
