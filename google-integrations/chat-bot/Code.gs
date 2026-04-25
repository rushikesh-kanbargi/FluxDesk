/**
 * Code.gs — FluxDesk Google Chat Bot — main entry point
 *
 * Entry points called by the Google Chat API:
 *   onMessage(event)    — handles all incoming messages
 *   onCardAction(event) — handles button clicks and dialog submissions
 *
 * Slash command routing:
 *   /review   → code-review tool     (code: string)
 *   /forge    → forge tool           (idea: string)
 *   /standup  → standup tool         (yesterday/today/blockers parsed)
 *   /commit   → commit tool          (diff: string)
 *   /spec     → feature-spec tool    (idea: string)
 *   /bug      → bug-task tool        (rawReport: string)
 *   /adr      → adr tool             (decision: string)
 *   /stack    → tech-stack tool      (projectType: string)
 *   /explain  → concept-explainer    (concept: string)
 *   /flashcards → flashcards tool    (content: string)
 *   /compare  → compare tool         (prompt: string)
 *   /improve  → improver tool        (prompt: string)
 *   /token    → opens setup dialog
 *   /help     → shows help card
 *
 * New tools not yet deployed on backend:
 *   /mirror, /decode, /handoff, /brain
 *   These return a placeholder card with a clear message.
 */

// ── Public entry points ──────────────────────────────────────────────────────

/**
 * Called by Chat for every incoming message (DM or @mention in a space).
 *
 * @param {Object} event - Chat message event
 * @returns {Object} Chat response object
 */
function onMessage(event) {
  try {
    var messageText = (event.message && event.message.text) ? event.message.text.trim() : '';
    var token = getUserToken();

    // Detect slash command (must start with /)
    if (!messageText.startsWith('/')) {
      // Plain message with no command — show help
      if (!token) return cardResponse(buildSetupCard());
      return cardResponse(buildHelpCard());
    }

    var parsed   = parseCommand(messageText);
    var command  = parsed.command;
    var argument = parsed.argument;

    // Token/setup commands don't require an existing token
    if (command === '/token') {
      return openSetupDialog();
    }
    if (command === '/help') {
      return cardResponse(buildHelpCard());
    }

    // All other commands require a valid token
    if (!token) {
      return cardResponse(buildSetupCard());
    }

    return routeCommand(command, argument, token);

  } catch (err) {
    return cardResponse(buildErrorCard('Unexpected error: ' + err.message));
  }
}

/**
 * Called by Chat when a user clicks a button or submits a dialog.
 *
 * @param {Object} event - Card action event
 * @returns {Object} Chat response object
 */
function onCardAction(event) {
  try {
    var action = event.action && event.action.actionMethodName;

    switch (action) {
      case 'openSetupDialog':   return openSetupDialog();
      case 'handleTokenSubmit': return handleTokenSubmit(event);
      case 'handleTokenClear':  return handleTokenClear();
      case 'showHelp':          return cardResponse(buildHelpCard());
      case 'dismissDialog':
        return { actionResponse: { type: 'CLOSE_DIALOG' } };
      default:
        return cardResponse(buildErrorCard('Unknown action: ' + escapeHtml(action)));
    }
  } catch (err) {
    return cardResponse(buildErrorCard('Unexpected error: ' + err.message));
  }
}

// ── Command routing ──────────────────────────────────────────────────────────

/**
 * Routes a parsed slash command to the correct tool call or handler.
 *
 * @param {string} command  - e.g. "/review"
 * @param {string} argument - everything after the command
 * @param {string} token    - user JWT token
 * @returns {Object} Chat response object
 */
function routeCommand(command, argument, token) {
  switch (command) {

    // ── Existing backend tools ──

    case '/review':
      return requireArgument(argument, command, function(arg) {
        return runTool('code-review', 'Code Review Brief', { code: arg }, token);
      });

    case '/forge':
      return requireArgument(argument, command, function(arg) {
        return runTool('forge', 'PromptForge', { idea: arg }, token);
      });

    case '/standup':
      return runStandupCommand(argument, token);

    case '/commit':
      return requireArgument(argument, command, function(arg) {
        return runTool('commit', 'Commit Writer', { diff: arg }, token);
      });

    case '/spec':
      return requireArgument(argument, command, function(arg) {
        return runTool('feature-spec', 'Feature Spec', { idea: arg }, token);
      });

    case '/bug':
      return requireArgument(argument, command, function(arg) {
        return runTool('bug-task', 'Bug → Task', { rawReport: arg }, token);
      });

    case '/adr':
      return requireArgument(argument, command, function(arg) {
        return runTool('adr', 'ADR Generator', { decision: arg }, token);
      });

    case '/stack':
      return requireArgument(argument, command, function(arg) {
        return runTool('tech-stack', 'Tech Stack Advisor', { projectType: arg }, token);
      });

    case '/explain':
      return requireArgument(argument, command, function(arg) {
        return runTool('concept-explainer', 'Concept Explainer', { concept: arg }, token);
      });

    case '/flashcards':
      return requireArgument(argument, command, function(arg) {
        return runTool('flashcards', 'Flashcard Factory', { content: arg }, token);
      });

    case '/compare':
      return requireArgument(argument, command, function(arg) {
        return runTool('compare', 'Model Comparator', { prompt: arg }, token);
      });

    case '/improve':
      return requireArgument(argument, command, function(arg) {
        return runTool('improver', 'Prompt Improver', { prompt: arg }, token);
      });

    // ── New tools (not yet on backend) ──

    case '/mirror':
      return cardResponse(buildComingSoonCard(
        'Meeting Mirror',
        '/mirror',
        'Transcribes and summarises meeting recordings into structured notes. ' +
        'This tool is coming in the next FluxDesk release. ' +
        'Try /forge or /spec in the meantime.'
      ));

    case '/decode':
      return cardResponse(buildComingSoonCard(
        'Email Intent Decoder',
        '/decode',
        'Decodes the true intent and tone of any email. ' +
        'This tool is coming in the next FluxDesk release. ' +
        'Try /improve to rewrite the email instead.'
      ));

    case '/handoff':
      return cardResponse(buildComingSoonCard(
        'Context Handoff',
        '/handoff',
        'Generates structured context documents for handing off work to teammates. ' +
        'This tool is coming in the next FluxDesk release. ' +
        'Try /spec to document a feature or /adr for a decision.'
      ));

    case '/brain':
      return cardResponse(buildComingSoonCard(
        'Work Brain Dump',
        '/brain',
        'Turns a chaotic brain dump into organised tasks and priorities. ' +
        'This tool is coming in the next FluxDesk release. ' +
        'Try /bug to structure a specific problem or /spec for a feature idea.'
      ));

    default:
      return cardResponse(buildErrorCard(
        'Unknown command: ' + escapeHtml(command) + '\n\nType /help to see all available commands.'
      ));
  }
}

// ── Tool execution ───────────────────────────────────────────────────────────

/**
 * Calls a FluxDesk tool via the API and returns a result or error card.
 *
 * @param {string} toolId    - Backend tool identifier
 * @param {string} toolName  - Human-readable name for display
 * @param {Object} inputs    - Tool input payload
 * @param {string} token     - User JWT token
 * @returns {Object} Chat response object
 */
function runTool(toolId, toolName, inputs, token) {
  try {
    var result = callTool(toolId, inputs, token);
    return cardResponse(buildResultCard(toolName, result.output));
  } catch (err) {
    return cardResponse(buildErrorCard(err.message));
  }
}

/**
 * Special handler for /standup that parses optional yesterday/today/blockers fields.
 * Accepts two formats:
 *   1. /standup <freeform text>          — sets as "today" field
 *   2. /standup yesterday: X today: Y blockers: Z — parsed fields
 *
 * @param {string} argument - Raw argument text after /standup
 * @param {string} token    - User JWT token
 * @returns {Object} Chat response object
 */
function runStandupCommand(argument, token) {
  if (!argument) {
    return cardResponse(buildErrorCard(
      'Usage: /standup <your update>\n\n' +
      'You can use sections:\n' +
      '/standup yesterday: Fixed the auth bug. today: Reviewing PRs. blockers: Waiting on design review.\n\n' +
      'Or just describe what you\'re working on:\n' +
      '/standup Finished onboarding flow, now working on dashboard metrics.'
    ));
  }

  var inputs = { yesterday: '', today: '', blockers: '', tone: 'concise' };

  // Try structured parse
  var yesterdayMatch = argument.match(/yesterday:\s*([\s\S]*?)(?=today:|blockers:|$)/i);
  var todayMatch     = argument.match(/today:\s*([\s\S]*?)(?=yesterday:|blockers:|$)/i);
  var blockersMatch  = argument.match(/blockers:\s*([\s\S]*?)(?=yesterday:|today:|$)/i);

  if (yesterdayMatch || todayMatch || blockersMatch) {
    inputs.yesterday = yesterdayMatch ? yesterdayMatch[1].trim() : '';
    inputs.today     = todayMatch     ? todayMatch[1].trim()     : '';
    inputs.blockers  = blockersMatch  ? blockersMatch[1].trim()  : '';
  } else {
    // Freeform — put everything as today
    inputs.today = argument;
  }

  return runTool('standup', 'Standup Writer', inputs, token);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses a slash command message into { command, argument }.
 * e.g. "/review function foo() { return 1; }" → { command: "/review", argument: "function foo() { ... }" }
 *
 * @param {string} text - Full message text
 * @returns {{ command: string, argument: string }}
 */
function parseCommand(text) {
  var spaceIndex = text.indexOf(' ');
  if (spaceIndex === -1) {
    return { command: text.toLowerCase(), argument: '' };
  }
  return {
    command:  text.substring(0, spaceIndex).toLowerCase(),
    argument: text.substring(spaceIndex + 1).trim(),
  };
}

/**
 * Guards a command handler — returns an error card if argument is empty.
 *
 * @param {string}   argument - The argument string (may be empty)
 * @param {string}   command  - The slash command for the error hint
 * @param {Function} fn       - Function to call with the argument if non-empty
 * @returns {Object} Chat response object
 */
function requireArgument(argument, command, fn) {
  if (!argument) {
    return cardResponse(buildErrorCard(
      'Please provide input after ' + command + '.\n\nExample: ' + command + ' <your content here>'
    ));
  }
  return fn(argument);
}

/**
 * Wraps a card object in the Chat response envelope.
 *
 * @param {Object} card - Card object (from Cards.gs builders)
 * @returns {Object} Chat API response
 */
function cardResponse(card) {
  return { cards: [card] };
}

/**
 * Builds a "coming soon" card for tools not yet deployed on the backend.
 *
 * @param {string} toolName   - Human-readable tool name
 * @param {string} command    - Slash command
 * @param {string} details    - Description and suggested alternative
 * @returns {Object} Card object
 */
function buildComingSoonCard(toolName, command, details) {
  return {
    header: {
      title: toolName + ' — Coming Soon',
      subtitle: 'FluxDesk',
      imageUrl: 'https://fonts.gstatic.com/s/i/productlogos/chat/v4/web-64dp/logo_chat_color_1x_web_64dp.png',
      imageStyle: 'AVATAR',
    },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: escapeHtml(details),
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
                  text: 'See All Commands',
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
