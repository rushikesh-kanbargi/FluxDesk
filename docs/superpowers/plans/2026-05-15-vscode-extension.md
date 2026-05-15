# VS Code Extension — Integrations Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add style.css, regex-based markdown rendering, prod API URL, packaging scripts, and deployment docs to the `promptos-vscode` extension.

**Architecture:** Three independent changes to the webview layer (CSS + JS), one config change (package.json default URL + scripts), and two new files (.vscodeignore, MARKETPLACE.md). No changes to the TypeScript extension host.

**Tech Stack:** Vanilla JS, VS Code CSS variables, @vscode/vsce for packaging.

---

### Task 1: Create `src/webview/style.css`

**Files:**
- Create: `promptos-vscode/src/webview/style.css`

- [ ] **Step 1: Create the file**

```css
/* FluxDesk VS Code Extension — Webview Styles
   Uses VS Code CSS variables for automatic light/dark/high-contrast theming. */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  padding: 12px;
  line-height: 1.5;
}

/* ── Auth screen ─────────────────────────────────────────────────────────── */

.auth-screen {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 20px;
}

.auth-screen h2 {
  font-size: 1.1em;
  font-weight: 600;
}

.auth-screen p {
  opacity: 0.8;
  font-size: 0.9em;
}

.auth-error {
  color: var(--vscode-inputValidation-errorForeground, #f48771);
  font-size: 0.85em;
}

/* ── Tool selector ───────────────────────────────────────────────────────── */

.tool-picker-wrap {
  margin-bottom: 12px;
}

.tool-picker-wrap label {
  display: block;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  margin-bottom: 4px;
}

select {
  width: 100%;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 3px;
  padding: 5px 8px;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  outline: none;
}

select:focus {
  border-color: var(--vscode-focusBorder);
}

/* ── Dynamic form ────────────────────────────────────────────────────────── */

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.form-field label {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

input[type="text"],
input[type="number"],
textarea {
  width: 100%;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 3px;
  padding: 5px 8px;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  outline: none;
  resize: vertical;
}

input[type="text"]:focus,
input[type="number"]:focus,
textarea:focus {
  border-color: var(--vscode-focusBorder);
}

textarea {
  min-height: 80px;
}

textarea.primary-field {
  min-height: 120px;
}

/* ── Submit button ───────────────────────────────────────────────────────── */

.submit-wrap {
  margin-top: 4px;
  margin-bottom: 12px;
}

button.run-btn {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 3px;
  padding: 6px 14px;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  cursor: pointer;
  width: 100%;
}

button.run-btn:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

button.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Error box ───────────────────────────────────────────────────────────── */

.error-box {
  background: var(--vscode-inputValidation-errorBackground, rgba(244,71,71,0.1));
  border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
  color: var(--vscode-inputValidation-errorForeground, #f48771);
  border-radius: 3px;
  padding: 8px 10px;
  font-size: 0.875em;
  margin-bottom: 8px;
}

/* ── Result card ─────────────────────────────────────────────────────────── */

.output-wrap {
  margin-top: 8px;
}

.output-card {
  border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.1));
  border-radius: 4px;
  overflow: hidden;
}

.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.output-actions {
  display: flex;
  gap: 6px;
}

.output-actions button {
  background: transparent;
  border: 1px solid var(--vscode-badge-foreground);
  color: var(--vscode-badge-foreground);
  border-radius: 3px;
  padding: 2px 8px;
  font-family: var(--vscode-font-family);
  font-size: 0.85em;
  cursor: pointer;
  opacity: 0.85;
}

.output-actions button:hover {
  opacity: 1;
  background: rgba(255,255,255,0.1);
}

/* Plain text output (pre element) */
.output-pre {
  padding: 10px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 0.9em;
  line-height: 1.6;
  overflow-x: auto;
}

/* Rendered markdown output (div) */
.output-content {
  padding: 10px;
  line-height: 1.6;
}

.output-content h1,
.output-content h2,
.output-content h3 {
  margin: 12px 0 6px;
  font-weight: 600;
}

.output-content h1 { font-size: 1.2em; }
.output-content h2 { font-size: 1.1em; }
.output-content h3 { font-size: 1em; }

.output-content p {
  margin: 6px 0;
}

.output-content code {
  background: var(--vscode-textCodeBlock-background, rgba(255,255,255,0.1));
  padding: 1px 4px;
  border-radius: 3px;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 0.9em;
}

.output-content pre {
  background: var(--vscode-textCodeBlock-background, rgba(255,255,255,0.1));
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 8px 0;
}

.output-content pre code {
  background: transparent;
  padding: 0;
  font-size: 0.88em;
}

.output-content ul,
.output-content ol {
  padding-left: 20px;
  margin: 6px 0;
}

.output-content li {
  margin: 2px 0;
}

.output-content hr {
  border: none;
  border-top: 1px solid var(--vscode-input-border, rgba(255,255,255,0.15));
  margin: 10px 0;
}

.output-content strong { font-weight: 600; }
.output-content em { font-style: italic; }
```

- [ ] **Step 2: Verify the file was created**

```bash
ls -la promptos-vscode/src/webview/style.css
```

Expected: file exists, ~200+ lines.

- [ ] **Step 3: Commit**

```bash
git add promptos-vscode/src/webview/style.css
git commit -m "feat(vscode): add webview style.css with VS Code theme variables"
```

---

### Task 2: Add `renderMarkdown` to `src/webview/main.js` and wire it to output

**Files:**
- Modify: `promptos-vscode/src/webview/main.js`

The current `renderOutput` function (around line 443) uses `pre.textContent = state.output` — a plain `<pre>` tag. We will replace the output section with a `<div class="output-content">` whose content is set via `innerText` on individual DOM nodes (no `innerHTML` with untrusted user input). The markdown renderer builds safe DOM nodes from the backend API response, not from arbitrary user input.

- [ ] **Step 1: Read current `renderOutput` region**

Open `promptos-vscode/src/webview/main.js` and locate the `renderOutput` function (lines ~400–450). Confirm it contains:
```js
const pre = makeEl('pre', 'output-pre');
pre.textContent = state.output;
card.appendChild(pre);
```

- [ ] **Step 2: Add the `renderMarkdown` function and a safe DOM builder**

Insert the following block immediately **above** the `// ─── Submit ──` comment (before line 451 in the current file):

```js
  // ─── Markdown renderer ─────────────────────────────────────────────────────
  // Zero external dependencies. Converts backend API output to safe DOM nodes.
  // Source content comes from the FluxDesk backend API (authenticated), not from
  // arbitrary user input. We build real DOM nodes rather than setting innerHTML.
  function renderMarkdown(text) {
    const fragment = document.createDocumentFragment();

    // Split into blocks on blank lines
    const rawBlocks = text.split(/\n{2,}/);

    rawBlocks.forEach(function (block) {
      block = block.trim();
      if (!block) return;

      // Fenced code block: ```lang\n...\n```
      var codeMatch = block.match(/^```(\w*)\n([\s\S]*?)```$/);
      if (codeMatch) {
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        if (codeMatch[1]) code.className = codeMatch[1];
        code.textContent = codeMatch[2];
        pre.appendChild(code);
        fragment.appendChild(pre);
        return;
      }

      // Horizontal rule
      if (/^---+$/.test(block)) {
        fragment.appendChild(document.createElement('hr'));
        return;
      }

      // Headings h1–h3
      var hMatch = block.match(/^(#{1,3})\s+(.*)/);
      if (hMatch) {
        var level = hMatch[1].length;
        var h = document.createElement('h' + level);
        applyInlineMarkdown(h, hMatch[2]);
        fragment.appendChild(h);
        return;
      }

      // Unordered list
      if (/^[-*]\s/.test(block)) {
        var ul = document.createElement('ul');
        block.split('\n').forEach(function (line) {
          var m = line.match(/^[-*]\s+(.*)/);
          if (m) {
            var li = document.createElement('li');
            applyInlineMarkdown(li, m[1]);
            ul.appendChild(li);
          }
        });
        fragment.appendChild(ul);
        return;
      }

      // Ordered list
      if (/^\d+\.\s/.test(block)) {
        var ol = document.createElement('ol');
        block.split('\n').forEach(function (line) {
          var m = line.match(/^\d+\.\s+(.*)/);
          if (m) {
            var li = document.createElement('li');
            applyInlineMarkdown(li, m[1]);
            ol.appendChild(li);
          }
        });
        fragment.appendChild(ol);
        return;
      }

      // Paragraph
      var p = document.createElement('p');
      applyInlineMarkdown(p, block.replace(/\n/g, ' '));
      fragment.appendChild(p);
    });

    return fragment;
  }

  // Applies inline markdown (bold, italic, inline code) to a parent element.
  // Splits the text on pattern boundaries and creates text/element nodes.
  function applyInlineMarkdown(parent, text) {
    // Tokenise: ```code```, **bold**, *italic*, `code`
    var parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    parts.forEach(function (part) {
      if (/^\*\*(.+)\*\*$/.test(part)) {
        var strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        parent.appendChild(strong);
      } else if (/^\*(.+)\*$/.test(part)) {
        var em = document.createElement('em');
        em.textContent = part.slice(1, -1);
        parent.appendChild(em);
      } else if (/^`(.+)`$/.test(part)) {
        var code = document.createElement('code');
        code.textContent = part.slice(1, -1);
        parent.appendChild(code);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    });
  }
```

- [ ] **Step 3: Replace the `<pre>` output with a rendered `<div>`**

Find this block inside `renderOutput`:
```js
    const pre = makeEl('pre', 'output-pre');
    pre.textContent = state.output;
    card.appendChild(pre);
```

Replace it with:
```js
    const contentDiv = makeEl('div', 'output-content');
    contentDiv.appendChild(renderMarkdown(state.output));
    card.appendChild(contentDiv);
```

Note: the raw `state.output` string is still used unchanged for copy/insert operations (already wired via `vscode.postMessage`). Only the visual display changes.

- [ ] **Step 4: Verify the extension still loads**

```bash
cd promptos-vscode
npm run compile 2>&1
```

Expected: exits 0, no TypeScript errors (this file is plain JS but tsc checks it via `checkJs` if configured — if not, just verify no parse errors).

- [ ] **Step 5: Commit**

```bash
git add promptos-vscode/src/webview/main.js
git commit -m "feat(vscode): add DOM-based markdown renderer for tool output"
```

---

### Task 3: Update `package.json` — prod API URL and packaging scripts

**Files:**
- Modify: `promptos-vscode/package.json`

- [ ] **Step 1: Change the default API URL**

In `promptos-vscode/package.json`, find:
```json
          "default": "http://localhost:4000",
```

Replace with:
```json
          "default": "https://flux-desk-vpqg.vercel.app",
```

- [ ] **Step 2: Add packaging scripts**

Find:
```json
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
```

Replace with:
```json
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package",
    "prepublish": "npm run compile"
  },
```

- [ ] **Step 3: Commit**

```bash
git add promptos-vscode/package.json
git commit -m "feat(vscode): set prod API URL and add vsce package scripts"
```

---

### Task 4: Create `.vscodeignore` and `MARKETPLACE.md`

**Files:**
- Create: `promptos-vscode/.vscodeignore`
- Create: `promptos-vscode/MARKETPLACE.md`

- [ ] **Step 1: Create `.vscodeignore`**

```
.vscode/**
src/**
tsconfig.json
node_modules/**
*.vsix
.gitignore
```

- [ ] **Step 2: Create `MARKETPLACE.md`**

```markdown
# Publishing FluxDesk to the VS Code Marketplace

## One-time setup

1. Create a publisher account at https://marketplace.visualstudio.com/manage
2. Generate a Personal Access Token:
   - Go to https://dev.azure.com → User Settings → Personal Access Tokens
   - New token: name it "vsce", set Expiry to 1 year, Scope → Marketplace → Manage
   - Copy the token (shown only once)
3. Install the packaging tool:
   ```bash
   npm install -g @vscode/vsce
   ```
4. Log in:
   ```bash
   vsce login fluxdesk
   # Paste the token when prompted
   ```

## Local install (no account needed)

```bash
cd promptos-vscode
npm install
npm run package
code --install-extension fluxdesk-*.vsix
```

## Publish to Marketplace

```bash
cd promptos-vscode
npm run package     # produces fluxdesk-0.1.0.vsix
vsce publish        # publishes and bumps patch version
```

Or publish a specific version:
```bash
vsce publish minor  # bumps minor, e.g. 0.1.0 → 0.2.0
vsce publish 1.0.0  # specific version
```

## Update publisher in package.json

Before publishing, set your publisher name in `package.json`:
```json
"publisher": "your-publisher-name"
```
```

- [ ] **Step 3: Commit**

```bash
git add promptos-vscode/.vscodeignore promptos-vscode/MARKETPLACE.md
git commit -m "chore(vscode): add .vscodeignore and MARKETPLACE.md"
```

---

### Task 5: Verify packaging end-to-end

**Files:** none (validation only)

- [ ] **Step 1: Install vsce if needed**

```bash
npm list -g @vscode/vsce || npm install -g @vscode/vsce
```

- [ ] **Step 2: Install extension dependencies**

```bash
cd promptos-vscode && npm install
```

- [ ] **Step 3: Compile TypeScript**

```bash
npm run compile
```

Expected: exits 0, `out/` directory populated.

- [ ] **Step 4: Package the extension**

```bash
npm run package
```

Expected: produces `fluxdesk-0.1.0.vsix` (or similar). The command will warn about missing README — that's acceptable for now.

- [ ] **Step 5: Confirm .vsix contents**

```bash
unzip -l fluxdesk-*.vsix | head -40
```

Expected: `extension/out/`, `extension/src/webview/`, `extension/media/` present. `node_modules/` and raw `src/` TypeScript files should NOT appear at top level.

- [ ] **Step 6: Final commit**

```bash
git add promptos-vscode/fluxdesk-*.vsix 2>/dev/null; true
git commit -m "chore(vscode): packaging verified — extension ready for install" --allow-empty
```
