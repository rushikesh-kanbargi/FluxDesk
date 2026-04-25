/**
 * Cards.gs — Gmail Add-on card builders for FluxDesk
 *
 * Gmail add-on cards use the CardService builder API (not raw JSON).
 * All functions return CardService.Card instances.
 *
 * Card limits:
 *   - Text paragraphs: 2 000 chars (we truncate to 1 800 for headroom)
 *   - Max sections per card: 10
 */

var MAX_RESULT_CHARS = 1800;
var MAX_PREVIEW_CHARS = 200;

// ── Public card builders ─────────────────────────────────────────────────────

/**
 * Builds the main sidebar card shown when an email is opened.
 * Displays a preview of the email and tool action buttons.
 *
 * @param {string} emailSubject - Subject line of the open email
 * @param {string} emailSender  - Sender name/address
 * @param {string} emailBody    - Plain-text body (HTML already stripped)
 * @returns {CardService.Card}
 */
function buildMainCard(emailSubject, emailSender, emailBody) {
  var preview = emailBody.substring(0, MAX_PREVIEW_CHARS);
  if (emailBody.length > MAX_PREVIEW_CHARS) preview += '…';

  // ── Header ──
  var header = CardService.newCardHeader()
    .setTitle('FluxDesk')
    .setSubtitle('AI tools for this email')
    .setImageUrl('https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_32dp.png')
    .setImageStyle(CardService.ImageStyle.CIRCLE);

  // ── Email preview section ──
  var previewSection = CardService.newCardSection()
    .setHeader('Email Context');

  previewSection.addWidget(
    CardService.newKeyValue()
      .setTopLabel('From')
      .setContent(emailSender || '(unknown)')
  );
  previewSection.addWidget(
    CardService.newKeyValue()
      .setTopLabel('Subject')
      .setContent(emailSubject || '(no subject)')
  );
  previewSection.addWidget(
    CardService.newTextParagraph()
      .setText('<i>' + escapeHtmlAddon(preview) + '</i>')
  );

  // ── Quick actions section ──
  var actionsSection = CardService.newCardSection()
    .setHeader('Quick Actions');

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Decode Email Intent')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleDecodeIntent')
      )
  );

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Translate for Stakeholders')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleStakeholderTranslate')
      )
  );

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Draft Standup from Email')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleDraftStandup')
      )
  );

  // ── Custom analysis section ──
  var customSection = CardService.newCardSection()
    .setHeader('Custom Analysis');

  customSection.addWidget(
    CardService.newTextInput()
      .setFieldName('customPrompt')
      .setTitle('What do you want to know?')
      .setHint('e.g. Summarise key action items, Is there urgency here?')
  );

  customSection.addWidget(
    CardService.newTextButton()
      .setText('Analyze')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleCustomAnalysis')
      )
  );

  // ── Settings link ──
  var settingsSection = CardService.newCardSection();
  settingsSection.addWidget(
    CardService.newTextButton()
      .setText('Settings / Update Token')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('showTokenDialog')
      )
  );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(previewSection)
    .addSection(actionsSection)
    .addSection(customSection)
    .addSection(settingsSection)
    .build();
}

/**
 * Builds the result card after a tool has run.
 *
 * @param {string}   toolName     - Human-readable tool name
 * @param {string}   result       - Raw text output from the API
 * @param {string}   backFunction - Apps Script function name to call on "Back"
 * @returns {CardService.Card}
 */
function buildResultCard(toolName, result, backFunction) {
  var display = result;
  var wasTruncated = false;

  if (display.length > MAX_RESULT_CHARS) {
    display = display.substring(0, MAX_RESULT_CHARS);
    wasTruncated = true;
  }

  var header = CardService.newCardHeader()
    .setTitle(toolName)
    .setSubtitle('FluxDesk result')
    .setImageUrl('https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_32dp.png')
    .setImageStyle(CardService.ImageStyle.CIRCLE);

  var resultSection = CardService.newCardSection();
  resultSection.addWidget(
    CardService.newTextParagraph()
      .setText(escapeHtmlAddon(display))
  );

  if (wasTruncated) {
    resultSection.addWidget(
      CardService.newTextParagraph()
        .setText('<i>Output truncated. View the full result on your FluxDesk instance.</i>')
    );
  }

  // Copy button — opens a dialog with the full text for easy selection
  var actionsSection = CardService.newCardSection();

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Copy Full Result')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('showCopyDialog')
          .setParameters({ resultKey: storeResultInCache(result) })
      )
  );

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Back')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName(backFunction || 'buildAddOn')
      )
  );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(resultSection)
    .addSection(actionsSection)
    .build();
}

/**
 * Builds the setup card shown when the user hasn't configured a token.
 *
 * @returns {CardService.Card}
 */
function buildSetupCard() {
  var header = CardService.newCardHeader()
    .setTitle('FluxDesk')
    .setSubtitle('Connect your account')
    .setImageUrl('https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_32dp.png')
    .setImageStyle(CardService.ImageStyle.CIRCLE);

  var section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph()
      .setText(
        'To use FluxDesk in Gmail, connect your account.\n\n' +
        '1. Open your FluxDesk instance\n' +
        '2. Go to <b>Settings → API</b>\n' +
        '3. Copy your Access Token\n' +
        '4. Click the button below and paste it'
      )
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Connect FluxDesk Account')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('showTokenDialog')
      )
  );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();
}

/**
 * Builds the token entry dialog body (used by showTokenDialog).
 *
 * @returns {CardService.Card}
 */
function buildTokenDialog() {
  var header = CardService.newCardHeader()
    .setTitle('Set API Token')
    .setSubtitle('FluxDesk');

  var section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph()
      .setText('Paste your FluxDesk JWT access token below. It will be stored securely in Google User Properties — never shared.')
  );
  section.addWidget(
    CardService.newTextInput()
      .setFieldName('userToken')
      .setTitle('Access Token')
      .setHint('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…')
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Save Token')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleSaveToken')
      )
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Remove Existing Token')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleRemoveToken')
      )
  );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();
}

/**
 * Builds an error card.
 *
 * @param {string} message - Error description
 * @returns {CardService.Card}
 */
function buildErrorCard(message) {
  var header = CardService.newCardHeader()
    .setTitle('Error')
    .setSubtitle('FluxDesk');

  var section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph()
      .setText('<b>Something went wrong:</b>\n\n' + escapeHtmlAddon(message || 'Unknown error'))
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Back to Inbox Analysis')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('buildAddOn')
      )
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Update Token')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('showTokenDialog')
      )
  );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();
}

// ── Cache helpers ────────────────────────────────────────────────────────────

/**
 * Stores a result string in CacheService (user scope, 10 min TTL).
 * Returns a short cache key for retrieval in button parameters.
 *
 * @param {string} result - Full result text to cache
 * @returns {string} Cache key
 */
function storeResultInCache(result) {
  var key = 'fluxdesk_result_' + new Date().getTime();
  CacheService.getUserCache().put(key, result, 600); // 10 minutes
  return key;
}

/**
 * Retrieves a previously cached result by key.
 *
 * @param {string} key - Cache key returned by storeResultInCache
 * @returns {string|null} Cached result or null if expired
 */
function getResultFromCache(key) {
  if (!key) return null;
  return CacheService.getUserCache().get(key);
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** Escapes HTML special characters for safe use in CardService text widgets. */
function escapeHtmlAddon(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
