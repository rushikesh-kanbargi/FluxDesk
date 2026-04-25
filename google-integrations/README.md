# FluxDesk — Google Workspace Integrations

Two Apps Script integrations that bring FluxDesk tools directly into Google Chat and Gmail.

---

## Directory Layout

```
google-integrations/
├── chat-bot/          # Google Chat bot (slash commands)
│   ├── appsscript.json
│   ├── Code.gs        # Entry points: onMessage, onCardAction
│   ├── Config.gs      # PropertiesService helpers
│   ├── ApiClient.gs   # UrlFetchApp wrapper
│   ├── Cards.gs       # Card builders
│   └── SetupFlow.gs   # Token setup dialog
│
├── gmail-addon/       # Gmail contextual add-on (sidebar)
│   ├── appsscript.json
│   ├── Code.gs        # Entry point: buildAddOn + action handlers
│   ├── Config.gs      # PropertiesService helpers
│   ├── ApiClient.gs   # UrlFetchApp wrapper
│   └── Cards.gs       # CardService card builders
│
└── README.md          # This file
```

---

## Prerequisites

### Google Cloud Project

Both integrations share a single Google Cloud project.

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the following APIs:
   - **Google Chat API** (for the Chat bot)
   - **Gmail Add-ons API** / **Gmail API** (for the Gmail add-on)
   - **Apps Script API** (required for clasp deployment)
3. Note the **Project Number** — you need it when configuring the Chat bot in the Chat API console.

---

## Deployment: Google Chat Bot

### Option A — clasp (recommended)

```bash
# Install clasp globally if you haven't already
npm install -g @google/clasp

# Authenticate
clasp login

# Create a new Apps Script project linked to your GCP project
cd google-integrations/chat-bot
clasp create --type standalone --title "FluxDesk Chat Bot"

# Push all files
clasp push

# Open the script in the browser to set Script Properties (see below)
clasp open
```

### Option B — Manual copy-paste

1. Go to [script.google.com](https://script.google.com) → **New project**
2. Rename the project to **FluxDesk Chat Bot**
3. Delete the default `Code.gs` content
4. For each `.gs` file in `chat-bot/`, create a new file in the editor (use **+** → **Script**) with the matching name, then paste the contents
5. Replace the default `appsscript.json` with the one in this repo (enable **View → Show manifest file** first)

### Configure Script Properties

In the Apps Script editor: **Project Settings → Script Properties → Add property**

| Property key        | Value                                     |
|---------------------|-------------------------------------------|
| `FLUXDESK_API_URL`  | `https://your-fluxdesk-instance.com` (no trailing slash) |

### Register the Chat Bot

1. In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Google Chat API → Configuration**
2. Set **App name**: `FluxDesk`
3. Set **App URL** to your Apps Script deployment URL (Web App deploy → Copy deployment URL)
4. Under **Slash commands**, register each command with its description (see the `/help` card in `Cards.gs` for the full list)
5. Set **Functionality** to allow DMs and spaces
6. Publish the bot (internal to your Workspace org for testing; public if needed)

---

## Deployment: Gmail Add-on

### Option A — clasp

```bash
cd google-integrations/gmail-addon
clasp create --type standalone --title "FluxDesk Gmail Add-on"
clasp push
clasp open
```

### Option B — Manual copy-paste

Same process as the Chat bot: create a new Apps Script project, paste each file, and replace `appsscript.json`.

### Configure Script Properties

| Property key       | Value                                |
|--------------------|--------------------------------------|
| `FLUXDESK_API_URL` | `https://your-fluxdesk-instance.com` |

### Install for Testing (Developer Install)

1. In the Apps Script editor → **Deploy → Test deployments → Install**
2. Open Gmail — the FluxDesk sidebar will appear in the right panel when you open any email

### Install via Workspace Admin (Organisation-wide)

1. Deploy as a **Gmail add-on** (Deploy → New deployment → Gmail add-on)
2. Copy the deployment ID
3. In **Google Admin Console → Apps → Google Workspace Marketplace → Manage apps → Install private app** → paste the deployment ID
4. Assign to users or OUs as needed

---

## User Token Setup

Both integrations store the user's FluxDesk JWT access token in Google's **User Properties** (scoped per-user — never shared with other users or visible to admins).

### How users get their token

1. Log in to the FluxDesk web app
2. Go to **Settings → API**
3. Copy the **Access Token** (it starts with `eyJ…`)

### Chat bot token setup

- On first message, the bot shows a setup card with a **Set API Token** button
- Clicking it opens a dialog — paste the token and click **Connect Account**
- The token is validated live against `GET /api/auth/me` before being stored
- Type `/token` at any time to update or remove the token

### Gmail add-on token setup

- When the add-on opens without a token, it shows a setup card
- Tap **Connect FluxDesk Account** → paste the token → **Save Token**
- The token is validated before being stored
- Tap **Settings / Update Token** in the sidebar footer to change it later

### Token lifetime

FluxDesk access tokens expire after 15 minutes (configurable in the backend `.env`). Users will need to re-enter their token after expiry. Consider implementing a longer-lived API key in the FluxDesk backend for Workspace integrations.

---

## Available Chat Commands

| Command               | Tool              | Input field       |
|-----------------------|-------------------|-------------------|
| `/review <code>`      | code-review       | `code`            |
| `/forge <idea>`       | forge             | `idea`            |
| `/standup [text]`     | standup           | `yesterday/today/blockers` |
| `/commit <diff>`      | commit            | `diff`            |
| `/spec <idea>`        | feature-spec      | `idea`            |
| `/bug <report>`       | bug-task          | `rawReport`       |
| `/adr <decision>`     | adr               | `decision`        |
| `/stack <project>`    | tech-stack        | `projectType`     |
| `/explain <concept>`  | concept-explainer | `concept`         |
| `/flashcards <text>`  | flashcards        | `content`         |
| `/compare <prompt>`   | compare           | `prompt`          |
| `/improve <prompt>`   | improver          | `prompt`          |
| `/token`              | (setup dialog)    | —                 |
| `/help`               | (help card)       | —                 |

**Coming soon** (placeholder cards shown):
- `/mirror` — Meeting Mirror
- `/decode` — Email Intent Decoder
- `/handoff` — Context Handoff
- `/brain` — Work Brain Dump

---

## Architecture Notes

- All HTTP calls use `UrlFetchApp.fetch` with `muteHttpExceptions: true` — errors are parsed from the response body and shown as cards, never as uncaught exceptions
- Email bodies are stripped of HTML tags and truncated to 3 000 chars before being sent to the API
- Tool results are cached in `CacheService` (user scope, 10-minute TTL) for the "Copy Result" dialog in the Gmail add-on — no repeated API calls
- The Chat bot truncates output to 3 800 chars (below the 4 000-char card widget limit) and notes how many chars were omitted
- No secrets, tokens, or API URLs are hardcoded — all configuration lives in `PropertiesService`
