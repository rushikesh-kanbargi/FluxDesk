# FluxDesk for VS Code

Bring the full FluxDesk AI dev toolkit into your editor. All 12 tools available
from a sidebar panel — with editor selection integration, one-click copy, and
insert-at-cursor support.

## Tools

| Tool | What it does |
|------|-------------|
| PromptForge | Raw idea → structured framework prompt (RISEN, CO-STAR, ReAct, …) |
| Prompt Improver | Grade and rewrite any existing prompt |
| Code Review Brief | Code → structured review checklist |
| Bug → Task | Messy report → clean Linear/Jira/GitHub ticket |
| Commit Writer | Diff/description → conventional commit messages |
| Feature Spec | One-liner → full spec with user stories & acceptance criteria |
| Standup Writer | Bullets → polished Slack standup |
| ADR Generator | Decision context → Architecture Decision Record |
| Tech Stack Advisor | Constraints → opinionated stack recommendation |
| Concept Explainer | Concept → multi-level explanation (ELI5 through Expert) |
| Flashcard Factory | Text/docs → spaced-repetition flashcards |
| Model Comparator | Prompt → comparison across Claude, GPT-4, Gemini |

## Commands

| Command | Keybinding | Description |
|---------|-----------|-------------|
| `fluxdesk.openPanel` | — | Open the FluxDesk sidebar panel |
| `fluxdesk.reviewSelection` | `Ctrl+Shift+R` / `Cmd+Shift+R` | Code Review with selected text pre-filled |
| `fluxdesk.explainSelection` | `Ctrl+Shift+E` / `Cmd+Shift+E` | Explain selected concept |
| `fluxdesk.forgeSelection` | — | Forge a prompt from the selection |

All three selection commands are also available in the right-click context menu.

## Setup

1. Start the FluxDesk app: `cd frontend && npm run dev` (runs on port 3000).
2. Log in to the FluxDesk web app and copy your access token from Profile → API Token.
3. In VS Code, click the FluxDesk icon in the Activity Bar and paste your token.

The token is stored in VS Code's encrypted `SecretStorage` — never in plaintext settings.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `fluxdesk.apiUrl` | `http://localhost:3000` | FluxDesk API base URL |

Change `fluxdesk.apiUrl` in VS Code settings if your app runs on a different host or port.

## Architecture

```
src/
├── extension.ts            — Activation, command registration
├── FluxdeskPanelProvider.ts — WebviewViewProvider + message bridge
├── auth.ts                 — JWT management via SecretStorage
├── api.ts                  — HTTP client (built-in https, no dependencies)
└── webview/
    ├── main.js             — Vanilla JS webview UI (no bundler)
    └── style.css           — VS Code theme-aware styles (var(--vscode-*))
```

No npm runtime dependencies. Compiled with `tsc` only.
