# Gmail Add-on — Integrations Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 new "Dev Tools" buttons to the FluxDesk Gmail add-on sidebar, restructure the main card into two sections (Email Actions + Dev Tools), set the production API URL, and create `DEPLOY.md` for both Google integrations.

**Architecture:** `Code.gs` gets 8 new action handler functions following the exact pattern of the existing 4. `Cards.gs` `buildMainCard` adds a new "Dev Tools" section with 8 buttons below the existing "Quick Actions" section (renamed "Email Actions"). `Config.gs` gets the prod URL. `DEPLOY.md` is created at `google-integrations/DEPLOY.md`.

**Tech Stack:** Google Apps Script, CardService builder API, CacheService for email context.

---

### Task 1: Update `Config.gs` — production URL

**Files:**
- Modify: `google-integrations/gmail-addon/Config.gs`

- [ ] **Step 1: Find the current URL in Config.gs**

Open `google-integrations/gmail-addon/Config.gs` and find:
```js
var DEFAULT_API_URL = 'http://localhost:4000';
```

- [ ] **Step 2: Change to production URL**

Replace:
```js
var DEFAULT_API_URL = 'http://localhost:4000';
```
With:
```js
var DEFAULT_API_URL = 'https://flux-desk-vpqg.vercel.app';
```

- [ ] **Step 3: Commit**

```bash
git add google-integrations/gmail-addon/Config.gs
git commit -m "feat(gmail-addon): set production API URL"
```

---

### Task 2: Add 8 action handlers to `Code.gs`

**Files:**
- Modify: `google-integrations/gmail-addon/Code.gs`

Add eight new handler functions after `handleCustomAnalysis` (after line ~270). Each follows the same pattern as the existing handlers: read cached email, check token, build inputs from email content, call `runToolForEmail`.

`bodySnippet` = `emailData.body.substring(0, 1500)` — safe for tool input limits.
`body` = `emailData.body` — full cleaned body up to 3,000 chars (already truncated in `buildAddOn`).

- [ ] **Step 1: Add `handleForgePrompt`**

Insert after `handleCustomAnalysis`:

```js
/**
 * Forge Prompt — turns the email subject + body snippet into a structured AI prompt idea.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 2: Add `handleImprovePrompt`**

```js
/**
 * Improve a Prompt — treats the email body as a prompt to improve.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 3: Add `handleDraftCommit`**

```js
/**
 * Draft Commit Message — treats the email body as a diff/description.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 4: Add `handleExtractBugTask`**

```js
/**
 * Extract Bug Task — treats the email body as a raw bug report.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 5: Add `handleWriteFeatureSpec`**

```js
/**
 * Write Feature Spec — uses the email subject as the feature idea.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 6: Add `handleDocumentDecision`**

```js
/**
 * Document Decision — treats the email body as a decision to record as an ADR.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 7: Add `handleMakeFlashcards`**

```js
/**
 * Make Flashcards — treats the email body as source material for flashcards.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 8: Add `handleComparePrompts`**

```js
/**
 * Compare Prompts — treats the email body snippet as a prompt to compare across models.
 * @param {Object} e - Action event
 * @returns {CardService.ActionResponse}
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
```

- [ ] **Step 9: Add two private helper functions**

Add these two helpers right before `// ── Private helpers ──` or at the end of `Code.gs` (they deduplicate the error response boilerplate):

```js
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
```

- [ ] **Step 10: Commit**

```bash
git add google-integrations/gmail-addon/Code.gs
git commit -m "feat(gmail-addon): add 8 Dev Tools action handlers"
```

---

### Task 3: Update `buildMainCard` in `Cards.gs` — add Dev Tools section

**Files:**
- Modify: `google-integrations/gmail-addon/Cards.gs`

The current `buildMainCard` has sections: Email Context, Quick Actions (3 buttons), Custom Analysis, Settings. We rename "Quick Actions" → "Email Actions", add a fourth button ("Custom Analysis" moves to its own section already), and append a new "Dev Tools" section with 8 buttons.

- [ ] **Step 1: Rename "Quick Actions" header to "Email Actions"**

Find:
```js
  var actionsSection = CardService.newCardSection()
    .setHeader('Quick Actions');
```

Replace with:
```js
  var actionsSection = CardService.newCardSection()
    .setHeader('Email Actions');
```

- [ ] **Step 2: Add the Dev Tools section**

Find the line that starts the `customSection`:
```js
  // ── Custom analysis section ──
  var customSection = CardService.newCardSection()
```

Insert the entire Dev Tools section **before** that comment:

```js
  // ── Dev tools section ──
  var devSection = CardService.newCardSection()
    .setHeader('Dev Tools');

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Forge Prompt')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleForgePrompt')
      )
  );

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Improve a Prompt')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleImprovePrompt')
      )
  );

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Draft Commit Message')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleDraftCommit')
      )
  );

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Extract Bug Task')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleExtractBugTask')
      )
  );

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Write Feature Spec')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleWriteFeatureSpec')
      )
  );

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Document Decision')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleDocumentDecision')
      )
  );

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Make Flashcards')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleMakeFlashcards')
      )
  );

  devSection.addWidget(
    CardService.newTextButton()
      .setText('Compare Prompts')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleComparePrompts')
      )
  );

```

- [ ] **Step 3: Add `devSection` to the card builder**

Find:
```js
  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(previewSection)
    .addSection(actionsSection)
    .addSection(customSection)
    .addSection(settingsSection)
    .build();
```

Replace with:
```js
  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(previewSection)
    .addSection(actionsSection)
    .addSection(devSection)
    .addSection(customSection)
    .addSection(settingsSection)
    .build();
```

- [ ] **Step 4: Commit**

```bash
git add google-integrations/gmail-addon/Cards.gs
git commit -m "feat(gmail-addon): add Dev Tools section with 8 buttons to main card"
```

---

### Task 4: Create `google-integrations/DEPLOY.md`

**Files:**
- Create: `google-integrations/DEPLOY.md`

- [ ] **Step 1: Create the file**

```markdown
# FluxDesk Google Integrations — Deployment Guide

Both integrations are deployed as Google Apps Script projects via `clasp`.

## Prerequisites (one-time)

1. A Google account with Gmail access
2. Enable the Apps Script API:
   - Go to https://script.google.com/home/usersettings
   - Turn on **Google Apps Script API**
3. Install clasp:
   ```bash
   npm install -g @google/clasp
   ```
4. Log in:
   ```bash
   clasp login
   # A browser window opens — authorise with your Google account
   ```

---

## Chat Bot

### First-time deploy

```bash
cd google-integrations/chat-bot
clasp create --title "FluxDesk Chat Bot" --type standalone
clasp push
```

### Configure Script Properties

In [Apps Script editor](https://script.google.com):
1. Open your FluxDesk Chat Bot project
2. **Project Settings → Script Properties → Add property**
   - Key: `FLUXDESK_API_URL`
   - Value: `https://flux-desk-vpqg.vercel.app`

### Register as a Google Chat App

In [Google Cloud Console](https://console.cloud.google.com):
1. Select or create a project
2. Enable the **Google Chat API**
3. Go to **Google Chat API → Configuration**
4. Fill in:
   - **App name:** FluxDesk
   - **Avatar URL:** (your logo URL or leave placeholder)
   - **Description:** AI dev toolkit — 16 tools as slash commands
   - **Functionality:** Check "Bot"
   - **Connection settings:** Select "Apps Script" → paste your Apps Script deployment ID
   - **Slash commands:** Register each command:

| Command | Description | Trigger |
|---|---|---|
| `/review` | Code Review Brief | Slash command |
| `/forge` | PromptForge | Slash command |
| `/standup` | Standup Writer | Slash command |
| `/commit` | Commit Writer | Slash command |
| `/spec` | Feature Spec | Slash command |
| `/bug` | Bug → Task | Slash command |
| `/adr` | ADR Generator | Slash command |
| `/stack` | Tech Stack Advisor | Slash command |
| `/explain` | Concept Explainer | Slash command |
| `/flashcards` | Flashcard Factory | Slash command |
| `/compare` | Model Comparator | Slash command |
| `/improve` | Prompt Improver | Slash command |
| `/mirror` | Meeting Mirror | Slash command |
| `/decode` | Email Intent Decoder | Slash command |
| `/handoff` | Context Handoff | Slash command |
| `/brain` | Work Brain Dump | Slash command |
| `/token` | Set API token | Slash command |
| `/help` | Show all commands | Slash command |

5. Set **Visibility** to your workspace or specific users for testing

### Subsequent deploys

```bash
cd google-integrations/chat-bot
clasp push
```

---

## Gmail Add-on

### First-time deploy

```bash
cd google-integrations/gmail-addon
clasp create --title "FluxDesk Gmail Add-on" --type standalone
clasp push
```

### Configure Script Properties

In [Apps Script editor](https://script.google.com):
1. Open your FluxDesk Gmail Add-on project
2. **Project Settings → Script Properties → Add property**
   - Key: `FLUXDESK_API_URL`
   - Value: `https://flux-desk-vpqg.vercel.app`

### Install as developer add-on for testing

In [Apps Script editor](https://script.google.com):
1. Click **Deploy → Test deployments**
2. Select **Gmail** as the application
3. Click **Install**
4. Open Gmail — the FluxDesk sidebar appears when you open any email

### Publish to Google Workspace Marketplace (when ready)

1. In the Apps Script editor: **Deploy → New deployment**
2. Type: Add-on
3. Fill in OAuth scopes (required):
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/script.storage`
   - `https://www.googleapis.com/auth/script.external_request`
4. Submit for review in [Google Workspace Marketplace SDK](https://console.cloud.google.com/apis/api/appsmarket-component.googleapis.com)

### Subsequent deploys

```bash
cd google-integrations/gmail-addon
clasp push
```
```

- [ ] **Step 2: Commit**

```bash
git add google-integrations/DEPLOY.md
git commit -m "docs: add Google integrations deployment guide"
```

---

### Task 5: Manual verification checklist

No code changes. Validate the add-on works after `clasp push`.

- [ ] **Step 1: Push the add-on**

```bash
cd google-integrations/gmail-addon
clasp push
```

Expected: `Pushed N files.` with no errors.

- [ ] **Step 2: Open an email in Gmail**

Open any email with some body text. The FluxDesk sidebar should load showing:
- "Email Context" section (From, Subject, preview)
- "Email Actions" section (3 buttons: Decode Intent, Translate for Stakeholders, Draft Standup)
- "Dev Tools" section (8 buttons: Forge Prompt, Improve a Prompt, Draft Commit Message, Extract Bug Task, Write Feature Spec, Document Decision, Make Flashcards, Compare Prompts)
- "Custom Analysis" section
- Settings button

- [ ] **Step 3: Test "Forge Prompt"**

Click "Forge Prompt". Expected: result card titled "Forge Prompt" with a structured AI prompt based on the email subject and body.

- [ ] **Step 4: Test "Extract Bug Task"**

Open an email that describes a bug or problem. Click "Extract Bug Task". Expected: a structured ticket-style card.

- [ ] **Step 5: Test "Make Flashcards"**

Open an email with instructional or informational content. Click "Make Flashcards". Expected: a set of Q&A flashcard pairs.

- [ ] **Step 6: Confirm existing Email Actions still work**

Click "Decode Email Intent" on any email. Expected: same result as before — the existing handlers are untouched.
