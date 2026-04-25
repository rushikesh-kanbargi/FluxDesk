/**
 * Cards.gs — Google Chat card builders for FluxDesk bot
 *
 * All functions return a valid Chat API card object (v1 card format).
 * Cards are returned inside a { cards: [...] } response envelope by the caller.
 *
 * Google Chat card text widget limit: ~4 000 chars per widget.
 * Truncation is handled here before content is injected.
 */

var MAX_OUTPUT_CHARS = 3800; // Leave headroom below the 4 000 limit

/** Truncates text to MAX_OUTPUT_CHARS and appends a note if trimmed. */
function truncateOutput(text) {
  if (!text) return '(no output)';
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return text.substring(0, MAX_OUTPUT_CHARS) + '\n\n_[Output truncated — ' +
    (text.length - MAX_OUTPUT_CHARS) + ' chars omitted. View full output on fluxdesk.app]_';
}

/**
 * Builds a result card displaying tool output.
 *
 * @param {string} toolName  - Human-readable tool name (e.g. "Code Review Brief")
 * @param {string} output    - Raw text output from the API
 * @returns {Object} Chat card object
 */
function buildResultCard(toolName, output) {
  var displayOutput = truncateOutput(output);

  return {
    header: {
      title: toolName,
      subtitle: 'FluxDesk result',
      imageUrl: 'https://fonts.gstatic.com/s/i/productlogos/chat/v4/web-64dp/logo_chat_color_1x_web_64dp.png',
      imageStyle: 'AVATAR',
    },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: '<pre>' + escapeHtml(displayOutput) + '</pre>',
            },
          },
        ],
      },
      {
        widgets: [
          {
            buttons: [
              {
                textButton: {
                  text: 'Run Another Tool',
                  onClick: {
                    action: {
                      actionMethodName: 'showHelp',
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Builds an error card with a descriptive message.
 *
 * @param {string} message - Human-readable error description
 * @returns {Object} Chat card object
 */
function buildErrorCard(message) {
  return {
    header: {
      title: 'Something went wrong',
      subtitle: 'FluxDesk',
      imageUrl: 'https://fonts.gstatic.com/s/i/productlogos/chat/v4/web-64dp/logo_chat_color_1x_web_64dp.png',
      imageStyle: 'AVATAR',
    },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: '<b>Error:</b> ' + escapeHtml(message || 'Unknown error'),
            },
          },
        ],
      },
      {
        widgets: [
          {
            buttons: [
              {
                textButton: {
                  text: 'Get Help',
                  onClick: {
                    action: {
                      actionMethodName: 'showHelp',
                    },
                  },
                },
              },
              {
                textButton: {
                  text: 'Set / Update Token',
                  onClick: {
                    action: {
                      actionMethodName: 'openSetupDialog',
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Builds the first-run setup card shown when a user hasn't configured their token.
 *
 * @returns {Object} Chat card object
 */
function buildSetupCard() {
  return {
    header: {
      title: 'Welcome to FluxDesk',
      subtitle: 'One-time setup required',
      imageUrl: 'https://fonts.gstatic.com/s/i/productlogos/chat/v4/web-64dp/logo_chat_color_1x_web_64dp.png',
      imageStyle: 'AVATAR',
    },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: 'To use FluxDesk, you need to connect your account.\n\n' +
                '1. Log in at your FluxDesk instance\n' +
                '2. Copy your <b>Access Token</b> from Settings → API\n' +
                '3. Click the button below and paste it in',
            },
          },
        ],
      },
      {
        widgets: [
          {
            buttons: [
              {
                textButton: {
                  text: 'Set API Token',
                  onClick: {
                    action: {
                      actionMethodName: 'openSetupDialog',
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Builds the help card listing all available slash commands.
 *
 * @returns {Object} Chat card object
 */
function buildHelpCard() {
  var commands = [
    { cmd: '/review <code>',       desc: 'Code Review Brief — structured review checklist for any code snippet' },
    { cmd: '/forge <idea>',        desc: 'PromptForge — turn a raw idea into a structured AI prompt' },
    { cmd: '/standup',             desc: 'Standup Writer — format your standup bullets for Slack' },
    { cmd: '/commit <diff>',       desc: 'Commit Writer — generate a conventional commit message from a diff' },
    { cmd: '/spec <idea>',         desc: 'Feature Spec — expand a one-liner into a full spec with user stories' },
    { cmd: '/bug <report>',        desc: 'Bug → Task — convert a messy report into a clean ticket' },
    { cmd: '/adr <decision>',      desc: 'ADR Generator — produce an Architecture Decision Record' },
    { cmd: '/stack <description>', desc: 'Tech Stack Advisor — get a reasoned stack recommendation' },
    { cmd: '/explain <concept>',   desc: 'Concept Explainer — get a multi-level explanation of any concept' },
    { cmd: '/flashcards <text>',   desc: 'Flashcard Factory — generate spaced-repetition cards from any text' },
    { cmd: '/compare <prompt>',    desc: 'Model Comparator — see how Claude, GPT-4, and Gemini would handle a prompt' },
    { cmd: '/improve <prompt>',    desc: 'Prompt Improver — grade and rewrite any prompt' },
    { cmd: '/token',               desc: 'Set or update your FluxDesk API token' },
    { cmd: '/help',                desc: 'Show this help message' },
  ];

  var listText = commands.map(function(c) {
    return '<b>' + escapeHtml(c.cmd) + '</b>\n' + escapeHtml(c.desc);
  }).join('\n\n');

  return {
    header: {
      title: 'FluxDesk Commands',
      subtitle: 'Available slash commands',
      imageUrl: 'https://fonts.gstatic.com/s/i/productlogos/chat/v4/web-64dp/logo_chat_color_1x_web_64dp.png',
      imageStyle: 'AVATAR',
    },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: listText,
            },
          },
        ],
      },
      {
        widgets: [
          {
            textParagraph: {
              text: '<i>Tip: For commands that need your standup content, type '
                + '/standup and then follow the prompts in the dialog.</i>',
            },
          },
        ],
      },
    ],
  };
}

/**
 * Builds a loading card displayed while waiting for the API.
 *
 * @param {string} toolName - Name of the tool being called
 * @returns {Object} Chat card object
 */
function buildLoadingCard(toolName) {
  return {
    header: {
      title: 'Running ' + toolName + '…',
      subtitle: 'FluxDesk is thinking',
      imageUrl: 'https://fonts.gstatic.com/s/i/productlogos/chat/v4/web-64dp/logo_chat_color_1x_web_64dp.png',
      imageStyle: 'AVATAR',
    },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: 'Processing your request. This usually takes 5–15 seconds…',
            },
          },
        ],
      },
    ],
  };
}

/** Escapes HTML special characters for safe embedding in card text widgets. */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
