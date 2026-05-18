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
   - **Description:** AI dev toolkit — 18 tools as slash commands
   - **Connection settings:** Select "Apps Script" → paste your Apps Script deployment ID
   - **Slash commands:** Register each command (name, description, slash command trigger):

| Command | Description |
|---|---|
| `/review` | Code Review Brief |
| `/forge` | PromptForge |
| `/standup` | Standup Writer |
| `/commit` | Commit Writer |
| `/spec` | Feature Spec |
| `/bug` | Bug → Task |
| `/adr` | ADR Generator |
| `/stack` | Tech Stack Advisor |
| `/explain` | Concept Explainer |
| `/flashcards` | Flashcard Factory |
| `/compare` | Model Comparator |
| `/improve` | Prompt Improver |
| `/mirror` | Meeting Mirror |
| `/decode` | Email Intent Decoder |
| `/handoff` | Context Handoff |
| `/brain` | Work Brain Dump |
| `/token` | Set API token |
| `/help` | Show all commands |

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

### Subsequent deploys

```bash
cd google-integrations/gmail-addon
clasp push
```
