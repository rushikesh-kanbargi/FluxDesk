/**
 * Code.gs — FluxDesk Gmail Add-on — main entry point
 *
 * The contextual trigger `buildAddOn(e)` fires every time the user opens an email.
 * All CardService.Action handlers must be top-level functions in this file or
 * another .gs file in the same project.
 *
 * Tool mappings:
 *   "Decode Email Intent"          → improver tool (closest available; email-intent-decoder
 *                                    is a future tool — shown as placeholder if 404)
 *   "Translate for Stakeholders"   → improver tool with stakeholder rewrite prompt
 *   "Draft Standup from Email"     → standup tool, email body as "today" context
 *   Custom analysis                → improver tool, user question + email body as prompt
 *
 * Email processing:
 *   - HTML tags stripped via regex before sending to API
 *   - Body truncated to EMAIL_BODY_MAX_CHARS (3 000) before API call
 *   - Results cached in CacheService (user scope) for the "Copy" dialog
 */

var EMAIL_BODY_MAX_CHARS = 3000;

// ── Contextual trigger ───────────────────────────────────────────────────────

/**
 * Called by Gmail when the user opens an email.
 * Builds and returns the sidebar card.
 *
 * @param {Object} e - Gmail contextual event object
 * @returns {CardService.Card}
 */
function buildAddOn(e) {
  try {
    var token = getUserToken();
    if (!token) {
      return buildSetupCard();
    }

    // When invoked as a contextual trigger, e.gmail.messageId is present.
    // When invoked as a CardService Back button action, e.gmail is absent —
    // fall back to the messageId cached by the most recent trigger call.
    var messageId = (e && e.gmail && e.gmail.messageId) ||
                    CacheService.getUserCache().get('email_current_id');
    if (!messageId) {
      return buildErrorCard('Could not read the current email. Try closing and reopening the add-on.');
    }

    var message;
    try {
      message = GmailApp.getMessageById(messageId);
    } catch (gmailErr) {
      return buildErrorCard('Gmail access error: ' + gmailErr.message);
    }

    var subject = message.getSubject() || '(no subject)';
    var sender  = message.getFrom()    || '(unknown sender)';
    var rawBody = message.getPlainBody() || message.getBody() || '';

    // Strip HTML, normalise whitespace, truncate
    var cleanBody = stripHtml(rawBody);
    cleanBody = cleanBody.substring(0, EMAIL_BODY_MAX_CHARS);

    // Cache the email context keyed by messageId so action handlers can read it
    // without needing it passed in parameters (GAS action parameters are strings only).
    CacheService.getUserCache().put(
      'email_subject_' + messageId,
      subject,
      600
    );
    CacheService.getUserCache().put(
      'email_sender_' + messageId,
      sender,
      600
    );
    CacheService.getUserCache().put(
      'email_body_' + messageId,
      cleanBody,
      600
    );
    CacheService.getUserCache().put(
      'email_current_id',
      messageId,
      600
    );

    return buildMainCard(subject, sender, cleanBody);

  } catch (err) {
    return buildErrorCard('Unexpected error: ' + err.message);
  }
}

// ── Action handlers ──────────────────────────────────────────────────────────

/**
 * Handles "Decode Email Intent" button click.
 * Uses the improver tool with a prompt focused on email intent decoding.
 * Falls back to a placeholder if the tool is not available.
 *
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
 */
function handleDecodeIntent(e) {
  var emailData = readCachedEmail();
  if (!emailData) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard('Email context expired. Please close and reopen the email.')
      ))
      .build();
  }

  var token = getUserToken();
  if (!token) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(buildSetupCard()))
      .build();
  }

  var prompt = 'Decode the intent of this email. Identify:\n' +
    '1. The primary ask or goal\n' +
    '2. The urgency level (Low/Medium/High/Critical)\n' +
    '3. The emotional tone (Neutral/Frustrated/Enthusiastic/Concerned/Formal)\n' +
    '4. Any implied expectations or subtext\n' +
    '5. Recommended response approach\n\n' +
    'From: ' + emailData.sender + '\n' +
    'Subject: ' + emailData.subject + '\n\n' +
    emailData.body;

  var card = runToolForEmail('improver', 'Email Intent Decoder', { prompt: prompt }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Handles "Translate for Stakeholders" button click.
 * Rewrites the email in clear, jargon-free language for non-technical stakeholders.
 *
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
 */
function handleStakeholderTranslate(e) {
  var emailData = readCachedEmail();
  if (!emailData) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard('Email context expired. Please close and reopen the email.')
      ))
      .build();
  }

  var token = getUserToken();
  if (!token) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(buildSetupCard()))
      .build();
  }

  var prompt = 'Rewrite this email for non-technical stakeholders. Remove jargon, ' +
    'clarify technical terms with plain language, highlight business impact, ' +
    'surface key decisions or asks, and make the action items explicit.\n\n' +
    'Original email:\n' +
    'From: ' + emailData.sender + '\n' +
    'Subject: ' + emailData.subject + '\n\n' +
    emailData.body;

  var card = runToolForEmail(
    'improver',
    'Stakeholder Translation',
    { prompt: prompt, context: 'Translating technical email for business stakeholders' },
    token
  );
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Handles "Draft Standup from Email" button click.
 * Uses the standup tool with the email body as today's context.
 *
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
 */
function handleDraftStandup(e) {
  var emailData = readCachedEmail();
  if (!emailData) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard('Email context expired. Please close and reopen the email.')
      ))
      .build();
  }

  var token = getUserToken();
  if (!token) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(buildSetupCard()))
      .build();
  }

  var todayContext = 'Reviewing and responding to: ' + emailData.subject + '\n\n' +
    'Email from ' + emailData.sender + ':\n' + emailData.body.substring(0, 500);

  var card = runToolForEmail(
    'standup',
    'Standup Update',
    {
      yesterday: '',
      today: todayContext,
      blockers: '',
      tone: 'concise',
    },
    token
  );
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Handles the custom analysis form submission.
 * Uses the improver tool with the user's question and email context as the prompt input.
 *
 * @param {Object} e - Action event with formInputs
 * @returns {CardService.ActionResponse}
 */
function handleCustomAnalysis(e) {
  var customPrompt = '';
  try {
    customPrompt = e.formInputs.customPrompt.stringInputs.value[0].trim();
  } catch (_) {}

  if (!customPrompt) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard('Please enter a question or instruction before clicking Analyze.')
      ))
      .build();
  }

  var emailData = readCachedEmail();
  if (!emailData) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard('Email context expired. Please close and reopen the email.')
      ))
      .build();
  }

  var token = getUserToken();
  if (!token) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(buildSetupCard()))
      .build();
  }

  var fullPrompt = customPrompt + '\n\n' +
    'Email context:\n' +
    'From: ' + emailData.sender + '\n' +
    'Subject: ' + emailData.subject + '\n\n' +
    emailData.body;

  var card = runToolForEmail(
    'improver',
    'Custom Analysis',
    { prompt: fullPrompt, context: customPrompt },
    token
  );
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Forge Prompt — turns email subject + body snippet into a structured AI prompt.
 */
function handleForgePrompt(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var bodySnippet = emailData.body.substring(0, 1500);
  var idea = emailData.subject + ': ' + bodySnippet;

  var card = runToolForEmail('forge', 'Forge Prompt', { idea: idea }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Improve a Prompt — treats the email body as a prompt to improve.
 */
function handleImprovePrompt(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var bodySnippet = emailData.body.substring(0, 1500);
  var card = runToolForEmail('improver', 'Improve a Prompt', { prompt: bodySnippet }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Draft Commit Message — treats the email body as a diff/description.
 */
function handleDraftCommit(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var card = runToolForEmail('commit', 'Draft Commit Message', { diff: emailData.body }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Extract Bug Task — treats the email body as a raw bug report.
 */
function handleExtractBugTask(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var card = runToolForEmail('bug-task', 'Extract Bug Task', { rawReport: emailData.body }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Write Feature Spec — uses the email subject as the feature idea.
 */
function handleWriteFeatureSpec(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var card = runToolForEmail('feature-spec', 'Write Feature Spec', { idea: emailData.subject }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Document Decision — treats the email body as a decision to record as an ADR.
 */
function handleDocumentDecision(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var card = runToolForEmail('adr', 'Document Decision', { decision: emailData.body }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Make Flashcards — treats the email body as source material for flashcards.
 */
function handleMakeFlashcards(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var card = runToolForEmail('flashcards', 'Make Flashcards', { content: emailData.body }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Compare Prompts — treats the email body snippet as a prompt to compare across models.
 */
function handleComparePrompts(e) {
  var emailData = readCachedEmail();
  if (!emailData) return expiredEmailResponse();
  var token = getUserToken();
  if (!token) return noTokenResponse();

  var bodySnippet = emailData.body.substring(0, 1500);
  var card = runToolForEmail('compare', 'Compare Prompts', { prompt: bodySnippet }, token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/** Returns an ActionResponse pushing an "email context expired" error card. */
function expiredEmailResponse() {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      buildErrorCard('Email context expired. Please close and reopen the email.')
    ))
    .build();
}

/** Returns an ActionResponse pushing the setup card when no token is set. */
function noTokenResponse() {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildSetupCard()))
    .build();
}

/**
 * Opens the token setup dialog as a new card.
 *
 * @returns {CardService.ActionResponse}
 */
function showTokenDialog() {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildTokenDialog()))
    .build();
}

/**
 * Handles token save from the token dialog form.
 *
 * @param {Object} e - Action event with formInputs
 * @returns {CardService.ActionResponse}
 */
function handleSaveToken(e) {
  var token = '';
  try {
    token = e.formInputs.userToken.stringInputs.value[0].trim();
  } catch (_) {}

  if (!token) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard('Token cannot be empty. Please paste your FluxDesk access token.')
      ))
      .build();
  }

  var result = validateToken(token);
  if (!result.valid) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard(
          'Token validation failed: ' + (result.error || 'Unknown error') +
          '\n\nMake sure you copied the full token from FluxDesk Settings → API.'
        )
      ))
      .build();
  }

  setUserToken(token);

  var displayName = (result.user && (result.user.displayName || result.user.username)) || 'there';
  var successSection = CardService.newCardSection();
  successSection.addWidget(
    CardService.newTextParagraph()
      .setText('<b>Connected, ' + escapeHtmlAddon(displayName) + '!</b>\n\nYour FluxDesk account is linked. Reopen any email to start using the tools.')
  );
  successSection.addWidget(
    CardService.newTextButton()
      .setText('Back')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('buildAddOn')
      )
  );

  var successCard = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Account Connected')
        .setSubtitle('FluxDesk')
    )
    .addSection(successSection)
    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(successCard))
    .build();
}

/**
 * Handles token removal.
 *
 * @returns {CardService.ActionResponse}
 */
function handleRemoveToken() {
  clearUserToken();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildSetupCard()))
    .build();
}

/**
 * Shows a dialog with the full cached result for easy copying.
 *
 * @param {Object} e - Action event with parameters.resultKey
 * @returns {CardService.ActionResponse}
 */
function showCopyDialog(e) {
  var key = e.parameters && e.parameters.resultKey;
  var result = getResultFromCache(key);

  if (!result) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildErrorCard('Result expired from cache. Please run the tool again.')
      ))
      .build();
  }

  var section = CardService.newCardSection()
    .setHeader('Full Result — select all text to copy');
  section.addWidget(
    CardService.newTextParagraph().setText(escapeHtmlAddon(result))
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Back')
      .setOnClickAction(
        CardService.newAction().setFunctionName('buildAddOn')
      )
  );

  var copyCard = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Copy Result')
        .setSubtitle('FluxDesk')
    )
    .addSection(section)
    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(copyCard))
    .build();
}

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Reads the currently cached email data (set by buildAddOn).
 *
 * @returns {{ subject: string, sender: string, body: string }|null}
 */
function readCachedEmail() {
  var cache = CacheService.getUserCache();
  var messageId = cache.get('email_current_id');
  if (!messageId) return null;

  var subject = cache.get('email_subject_' + messageId) || '(no subject)';
  var sender  = cache.get('email_sender_'  + messageId) || '(unknown)';
  var body    = cache.get('email_body_'    + messageId) || '';

  return { subject: subject, sender: sender, body: body };
}

/**
 * Calls a FluxDesk tool and returns either a result card or an error card.
 *
 * @param {string} toolId   - Backend tool identifier
 * @param {string} toolName - Human-readable name
 * @param {Object} inputs   - Tool input payload
 * @param {string} token    - JWT access token
 * @returns {CardService.Card}
 */
function runToolForEmail(toolId, toolName, inputs, token) {
  try {
    var result = callTool(toolId, inputs, token);
    return buildResultCard(toolName, result.output, 'buildAddOn');
  } catch (err) {
    return buildErrorCard(err.message);
  }
}

/**
 * Strips HTML tags from a string and normalises whitespace.
 * Handles common HTML entities for clean plain-text output.
 *
 * @param {string} html - Raw HTML string
 * @returns {string} Plain text
 */
function stripHtml(html) {
  if (!html) return '';

  return html
    // Remove style and script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Replace block-level tags with newlines
    .replace(/<\/(p|div|br|tr|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Collapse excessive blank lines (3+ → 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading/trailing whitespace
    .trim();
}
