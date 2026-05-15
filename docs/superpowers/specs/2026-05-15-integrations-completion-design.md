# FluxDesk Integrations Completion — Design Spec
**Date:** 2026-05-15
**Scope:** promptos-vscode, google-integrations/chat-bot, google-integrations/gmail-addon
**Status:** Approved

---

## 1. Overview

Three independent FluxDesk integration components require gap-filling and deployment packaging. All share the same backend API (`https://flux-desk-vpqg.vercel.app`). No changes to the backend or main frontend are required.

### Components in scope

| Component | Type | Changes |
|---|---|---|
| `promptos-vscode` | VS Code extension | style.css, markdown rendering, prod URL, .vsix package |
| `google-integrations/chat-bot` | Google Apps Script | 4 placeholder commands implemented, prod URL, help card updated |
| `google-integrations/gmail-addon` | Google Apps Script | 8 additional tools exposed, 2-section layout, prod URL |

---

## 2. VS Code Extension (`promptos-vscode`)

### 2.1 Missing `style.css`

**File:** `src/webview/style.css`

Create from scratch using VS Code CSS variables so the extension themes correctly across light, dark, and high-contrast modes. Variables used:

```
--vscode-editor-background
--vscode-editor-foreground
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
--vscode-input-background
--vscode-input-foreground
--vscode-input-border
--vscode-focusBorder
--vscode-badge-background
--vscode-badge-foreground
--vscode-font-family
--vscode-font-size
```

Sections to style:
- Body / container layout
- Auth screen (token input, submit button, error message)
- Tool selector dropdown
- Dynamic form (labels, inputs, textareas, selects)
- Submit button + loading state
- Result card (output area, action buttons: copy, insert at cursor)
- Error card

### 2.2 Markdown Rendering

**File:** `src/webview/main.js` — add `renderMarkdown(text)` function

Zero external dependencies. Regex-based transforms covering the patterns FluxDesk tools produce:

| Pattern | Transform |
|---|---|
| ` ```lang\n...\n``` ` | `<pre><code class="lang">...</code></pre>` |
| `` `inline` `` | `<code>inline</code>` |
| `## Heading` | `<h2>Heading</h2>` (h1–h3) |
| `**bold**` | `<strong>bold</strong>` |
| `*italic*` | `<em>italic</em>` |
| `- item` / `* item` | `<ul><li>item</li></ul>` |
| `1. item` | `<ol><li>item</li></ol>` |
| `---` | `<hr>` |
| Blank line between paragraphs | `<p>` wrapping |

Applied when rendering result output. Raw text preserved for copy/insert operations (not the rendered HTML).

### 2.3 Production API URL

**File:** `package.json` — `contributes.configuration.properties.fluxdesk.apiUrl`

```json
"default": "https://flux-desk-vpqg.vercel.app"
```

Changed from `http://localhost:4000`. Users who have explicitly set a custom URL via VS Code settings are unaffected.

### 2.4 Packaging

**File:** `package.json` — add scripts:
```json
"compile": "tsc -p ./",
"package": "vsce package",
"prepublish": "npm run compile"
```

**New file:** `MARKETPLACE.md` — publisher account setup + publish steps:
1. Create publisher at `marketplace.visualstudio.com/manage`
2. Generate Personal Access Token (Azure DevOps, Marketplace scope)
3. `npm install -g @vscode/vsce`
4. `vsce login <publisher-name>`
5. `vsce publish`

**New file:** `.vscodeignore` — exclude `src/`, `tsconfig.json`, `node_modules/` from the packaged `.vsix`.

---

## 3. Google Chat Bot (`google-integrations/chat-bot`)

### 3.1 Four Placeholder Commands → Real Commands

All four tools exist on the backend. Implementation follows the exact same pattern as the existing 12 commands.

#### `/mirror <transcript>`
- **Backend tool:** `meetingMirror`
- **Input mapping:** Full argument text → `transcript` field
- **meetingType:** Extract first word if it matches known types (`standup`, `planning`, `retro`, `1on1`, `review`); otherwise omit (tool handles auto-detection)
- **Code.gs:** Replace `handleMirror` stub with real `callTool('meetingMirror', {...})` call

#### `/decode <email>`
- **Backend tool:** `emailIntentDecoder`
- **Input mapping:** Full argument text → `email` field; `relationship` field omitted (optional)
- **Code.gs:** Replace `handleDecode` stub

#### `/handoff <task>`
- **Backend tool:** `contextHandoff`
- **Input mapping:** Split on ` // ` separator if present (`task // progress // openItems`); otherwise full text → `task` field only
- **Code.gs:** Replace `handleHandoff` stub

#### `/brain <dump>`
- **Backend tool:** `workBrainDump`
- **Input mapping:** Full argument text → `dump` field
- **Code.gs:** Replace `handleBrain` stub

#### Cards.gs changes
- Remove four "Coming Soon" card builder functions
- Add four result card builders (reuse `buildResultCard` pattern — already handles truncation to 3,800 chars)

#### `/help` card update
- **Cards.gs `buildHelpCard`:** Add four new commands to the command list with descriptions

### 3.2 Production API URL

**File:** `Config.gs`
```js
var DEFAULT_API_URL = 'https://flux-desk-vpqg.vercel.app';
```

Changed from `http://localhost:4000`.

---

## 4. Gmail Add-on (`google-integrations/gmail-addon`)

### 4.1 Eight Additional Tools

Current 4 tools remain unchanged. Eight tools added:

| Button label | Tool ID | Primary input from email |
|---|---|---|
| Forge Prompt | `forge` | `${subject}: ${bodySnippet}` → `idea` |
| Improve a Prompt | `improver` | `bodySnippet` → `prompt` |
| Draft Commit Message | `commit` | `body` → `diff` |
| Extract Bug Task | `bug-task` | `body` → `rawReport` |
| Write Feature Spec | `feature-spec` | `subject` → `idea` |
| Document Decision | `adr` | `body` → `decision` |
| Make Flashcards | `flashcards` | `body` → `content` |
| Compare Prompts | `compare` | `bodySnippet` → `prompt` |

`bodySnippet` = body truncated to 1,500 chars (safe for tool input limits). `body` = full cleaned body up to 3,000 chars (existing truncation logic).

### 4.2 Layout Change

**From:** Four stacked full-width buttons
**To:** Two sections with buttons

**Section 1 — "Email Actions" (4 buttons, existing)**
Context-aware tools that directly use email content: Decode Intent, Translate for Stakeholders, Draft Standup, Custom Analysis.

**Section 2 — "Dev Tools" (8 buttons, new)**
General dev tools pre-filled with email context: Forge Prompt, Improve a Prompt, Draft Commit Message, Extract Bug Task, Write Feature Spec, Document Decision, Make Flashcards, Compare Prompts.

Each button calls an action handler in `Code.gs` that builds a pre-filled form card (same `buildActionForm` pattern used by Custom Analysis), passes email context as pre-filled values, and submits to `/api/tools/{toolId}/run`.

### 4.3 Production API URL

**File:** `Config.gs`
```js
var DEFAULT_API_URL = 'https://flux-desk-vpqg.vercel.app';
```

---

## 5. Deployment

### 5.1 VS Code Extension

**Immediate install (no account needed):**
```bash
cd promptos-vscode
npm install
npm run package
code --install-extension promptos-vscode-*.vsix
```

**Marketplace publish (when ready):**
See `promptos-vscode/MARKETPLACE.md`.

### 5.2 Google Integrations (`google-integrations/DEPLOY.md`)

**Prerequisites (manual, one-time):**
1. Google account with Google Workspace or personal Gmail
2. Enable Apps Script API at `script.google.com/home/usersettings`
3. `npm install -g @google/clasp`
4. `clasp login` (browser OAuth flow)

**Chat Bot deployment:**
```bash
cd google-integrations/chat-bot
clasp create --title "FluxDesk Chat Bot" --type standalone
clasp push
# Then in script.google.com: set Script Property FLUXDESK_API_URL
# Then in Google Cloud Console: register bot in Google Chat API
```

**Gmail Add-on deployment:**
```bash
cd google-integrations/gmail-addon
clasp create --title "FluxDesk Gmail Add-on" --type standalone
clasp push
# Then in script.google.com: set Script Property FLUXDESK_API_URL
# Install as developer add-on for testing
```

`DEPLOY.md` will contain exact values for Google Chat API registration (bot name, description, slash command definitions, avatar URL placeholder, connection type: Apps Script).

---

## 6. Files Changed / Created

### `promptos-vscode/`
- `src/webview/style.css` — **create**
- `src/webview/main.js` — **modify** (add `renderMarkdown`, update result rendering)
- `package.json` — **modify** (default API URL, add scripts)
- `.vscodeignore` — **create**
- `MARKETPLACE.md` — **create**

### `google-integrations/chat-bot/`
- `Code.gs` — **modify** (implement 4 handlers)
- `Cards.gs` — **modify** (remove 4 stubs, update help card)
- `Config.gs` — **modify** (prod URL)

### `google-integrations/gmail-addon/`
- `Code.gs` — **modify** (8 new action handlers)
- `Cards.gs` — **modify** (2-section layout, 8 new form cards)
- `Config.gs` — **modify** (prod URL)

### `google-integrations/`
- `DEPLOY.md` — **create**

---

## 7. Constraints

- VS Code extension maintains zero npm runtime dependencies
- Markdown renderer uses no external library
- Apps Script files remain plain `.gs` (no bundler, clasp handles transpilation)
- No existing functional features altered
- No deprecated APIs used (`vscode.window.showInputBox` not used for auth — already uses webview)
- Gmail add-on stays within CardService API limits (no raw JSON cards)
- Chat bot truncation limit of 3,800 chars preserved for all new commands

---

## 8. Out of Scope

- Backend changes
- VS Code extension unit tests
- Apps Script unit tests
- Google Workspace Marketplace listing (admin install only for now)
- Email thread context in Gmail add-on
- Rate limiting UI
- Analytics/usage tracking
