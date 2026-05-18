# FluxDesk — Full Platform Ecosystem Design

**Date:** 2026-05-18
**Status:** Approved
**Scope:** Web application redesign — transform FluxDesk from a 21-tool utility into a full developer productivity platform

---

## 1. Vision

FluxDesk evolves from a collection of standalone AI tools into a connected platform where tools chain together into flows, projects organise all work, external services plug in via integrations, and every action across all clients (web, VS Code, Gmail, Chat Bot) is visible in a unified activity feed.

---

## 2. Navigation Architecture

### Shell Layout: Icon Rail + Sub-panel + Content

Replace the current flat sidebar with a three-column shell:

| Column | Width | Content |
|--------|-------|---------|
| Icon rail | 52px | 8 icon buttons, active state with left-edge accent bar, tooltips on hover |
| Sub-panel | 220px | Contextual list for the active rail section (project list, tool categories, etc.) |
| Content | flex-1 | Page content, max-width 1100px centred |

### Icon Rail Items (top to bottom)

| Icon | Section | Sub-panel content |
|------|---------|-------------------|
| Home | Dashboard | Quick stats, recent tools, memory profile |
| Folder | Projects | Project list + New Project CTA |
| Lightning | Flows | Flow list per active project |
| Nodes | Integrations | Connected + available platforms |
| Grid | All Tools | Tool categories list |
| Book | Library | Saved prompts, tags, search |
| People | Team | Members, shared flows, shared library |
| (spacer) | — | — |
| Settings | Settings | API keys, preferences, account |

### Topbar
- Left: FluxDesk wordmark
- Centre: `⌘K` global search (tools, projects, flows, history)
- Right: AI provider pill (animated pulse dot) · Notifications bell · User avatar

---

## 3. New Sections

### 3.1 Projects

**Purpose:** Organise all tool runs, flows, saved prompts, and integrations into named initiatives.

**Data model additions:**
```
Project {
  id          uuid PK
  userId      uuid FK
  name        string
  color       string (hex)
  description string?
  createdAt   datetime
  updatedAt   datetime
}
```

**UI — Projects list page:**
- 3-column card grid
- Each card: project name, colour dot, connected integration badges (GitHub, Jira, etc.), run count, flow count, saved prompt count
- "New Project" dashed card at end

**UI — Project detail page:**
- Header: project name, last active time, connected integrations
- 4 stat cards: Tool Runs · Active Flows · Saved Prompts · Integrations
- Active Flows section: flow cards with chain visualisation
- Recent Activity section: last 10 tool runs in this project, with platform badges

**Behaviour:**
- All tool runs, flows, and saved prompts can be tagged to a project
- The active project persists in `uiStore` and is sent as `projectId` on every API call
- Project context is injected into tool system prompts for personalisation

---

### 3.2 Flows

**Purpose:** Chain tool outputs into inputs, with optional integration actions at any step. Run manually or auto-trigger via webhook/integration event.

**Data model additions:**
```
Flow {
  id          uuid PK
  userId      uuid FK
  projectId   uuid FK?
  name        string
  steps       Json   -- ordered array of FlowStep
  trigger     Json   -- { type: 'manual'|'webhook'|'github_pr'|'gmail', config: {} }
  status      enum   ACTIVE | PAUSED
  runCount    int
  lastRunAt   datetime?
  createdAt   datetime
}

FlowRun {
  id        uuid PK
  flowId    uuid FK
  status    enum RUNNING | SUCCESS | FAILED
  stepOutputs Json  -- { stepIndex: output }
  startedAt datetime
  finishedAt datetime?
  error     string?
}
```

**Flow step schema:**
```json
{
  "type": "tool" | "integration_action",
  "toolId": "bug-task",
  "inputMap": { "rawReport": "{{trigger.body}}" },
  "outputFields": ["title", "priority", "steps"]
}
```

**UI — Flow builder:**
- Vertical step list with numbered nodes
- Each step: dropdown to select tool or integration action
- Output map panel below each step: shows available output fields, lets user drag/map them to next step's inputs
- Trigger selector at bottom: Manual / GitHub PR opened / Gmail received / Webhook URL
- "Add step" dashed button
- Save Flow button

**UI — Flow list:**
- Cards showing: name, step chain (coloured nodes with arrows), status badge (Active/Paused), run count, last run time, trigger type

**Flow execution engine (backend):**
- `POST /api/flows/:id/run` — execute a flow manually
- `POST /api/webhooks/:webhookId` — public endpoint for external trigger
- Each step calls the existing `callAI()` engine, maps outputs to next step inputs
- On completion, creates a `FlowRun` record and a `ToolUsage` record per step

---

### 3.3 Integrations

**Purpose:** OAuth connections to external platforms, usable as flow triggers and flow action steps.

**Data model additions:**
```
Integration {
  id           uuid PK
  userId       uuid FK
  provider     enum GITHUB | JIRA | SLACK | NOTION | LINEAR | GITLAB | GMAIL | GCAL
  accessToken  string (encrypted)
  refreshToken string? (encrypted)
  metadata     Json   -- { workspaceId, botId, repoOwner, etc. }
  connectedAt  datetime
}

Webhook {
  id        uuid PK
  userId    uuid FK
  flowId    uuid FK
  secret    string
  events    string[]  -- ["github.pull_request.opened"]
  lastFiredAt datetime?
}
```

**UI — Integrations page:**
- "Connected" section: cards with green Live badge, shows scopes/workspace
- "Available" section: cards with Connect button → OAuth flow opens in modal
- "Incoming Webhooks" section: table of webhook URLs per flow, copy button, recent events list

**Available integration actions per provider:**

| Provider | Trigger events | Action steps |
|----------|---------------|--------------|
| GitHub | PR opened/merged, Issue created | Create issue, Comment on PR |
| Jira | Issue created | Create ticket, Update status |
| Slack | — | Post message to channel |
| Notion | — | Create page, Append to page |
| Linear | Issue created | Create issue |
| GitLab | MR opened | Create issue, Comment on MR |
| Gmail | Email received | — (read only) |
| Google Calendar | — | Create event |

**OAuth implementation:**
- `GET /api/integrations/connect/:provider` → redirect to provider OAuth
- `GET /api/integrations/callback/:provider` → handle callback, encrypt + store tokens
- Tokens encrypted with AES-256 using `INTEGRATION_ENCRYPTION_KEY` env var

---

### 3.4 Activity Feed

**Purpose:** Unified chronological timeline of every tool run across all platforms.

**Data model change:**
Add `source` column to `ToolUsage`:
```
ToolUsage {
  ...existing fields...
  source     enum WEB | VSCODE | GMAIL | CHATBOT | FLOW  DEFAULT WEB
  projectId  uuid FK?
}
```

The `X-FluxDesk-Client` header (already implemented on all clients) populates `source` on every tool run.

**UI — Activity Feed page:**
- Filter pills: All Platforms · VS Code · Web · Gmail · Chat Bot · Flows · per-project
- Feed: chronological list, grouped by date (Today / Yesterday / older)
- Each item: platform icon, tool name, source badge (coloured by platform), preview of output, timestamp, project tag
- Click item → right panel shows full input + output + actions (Open in Tool, Copy Output, Add to Flow, Save to Library)
- Right stats sidebar: platform breakdown %, top tools (7d), flow runs, total activity count + week-over-week delta

**API:**
- `GET /api/activity?platform=vscode&projectId=xxx&limit=50&cursor=xxx` — paginated, filterable

---

### 3.5 Team

**Purpose:** Invite teammates, share flows and saved prompts across a team workspace.

**Data model additions:**
```
Team {
  id        uuid PK
  name      string
  ownerId   uuid FK
  createdAt datetime
}

TeamMember {
  teamId  uuid FK
  userId  uuid FK
  role    enum OWNER | ADMIN | MEMBER
  joinedAt datetime
}
```

**Shared resources:**
- Flows: owner can mark a flow as `shared: true` → visible to all team members
- Library prompts: owner can mark prompt as `sharedWithTeam: true`
- Projects: projects can be team-scoped (visible to all members)

**UI — Team page:**
- Members list with avatar, role badge, joined date
- Invite by email → sends magic link
- Shared Flows section: list of team flows
- Shared Library section: count + link to filtered library view

---

## 4. Existing Pages — Changes

### Dashboard
- Add "Connected Platforms" widget (already built — web/vscode/gmail/chat status)
- Add "Active Projects" widget replacing generic tool grid
- "Continue where you left off" now shows last project, not just last tool

### Tool Pages
- Add project picker dropdown in tool header (assign run to a project)
- After a run: "Add to Flow" button opens flow builder with this tool pre-added as a step
- Output copy button already fixed to extract `prompt` field for PromptForge

### Library
- Add team filter tab (My Prompts / Team Prompts)
- Add project filter

### History
- Merged into Activity Feed — `/history` redirects to `/activity`

---

## 5. API Routes Added

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/projects` | List / create projects |
| GET/PATCH/DELETE | `/api/projects/:id` | Get / update / delete project |
| GET/POST | `/api/flows` | List / create flows |
| GET/PATCH/DELETE | `/api/flows/:id` | Get / update / delete flow |
| POST | `/api/flows/:id/run` | Execute flow manually |
| GET | `/api/flows/:id/runs` | Flow run history |
| GET/POST | `/api/integrations` | List connected / connect new |
| DELETE | `/api/integrations/:provider` | Disconnect |
| GET | `/api/integrations/connect/:provider` | OAuth redirect |
| GET | `/api/integrations/callback/:provider` | OAuth callback |
| GET/POST | `/api/webhooks` | List / create incoming webhooks |
| POST | `/api/webhooks/:id` | Public webhook trigger endpoint |
| GET | `/api/activity` | Paginated activity feed |
| GET/POST | `/api/team` | Get / create team |
| POST | `/api/team/invite` | Invite member by email |
| GET/PATCH/DELETE | `/api/team/members/:userId` | Manage member |

---

## 6. Database Migrations

1. Add `Project` table
2. Add `Flow` + `FlowRun` tables
3. Add `Integration` + `Webhook` tables
4. Add `Team` + `TeamMember` tables
5. Add `source` enum + `projectId` FK to `ToolUsage`
6. Add `projectId` FK to `Prompt` (saved prompts)
7. Add `sharedWithTeam` bool to `Prompt`
8. Add `shared` bool to `Flow`

---

## 7. Implementation Order

Build in this sequence — each phase is independently shippable:

| Phase | Scope | Why first |
|-------|-------|-----------|
| 1 | DB migrations + API routes skeleton | Unblocks all other work |
| 2 | Projects UI + `projectId` on tool runs | Foundations for organising work |
| 3 | Activity Feed + `source` tracking | Immediate value, uses existing data |
| 4 | Flows builder + execution engine | Core differentiator |
| 5 | Integrations (GitHub + Jira first) | Most requested, powers Flows |
| 6 | Team features | Requires all above to be useful |
| 7 | Slack + Notion + Linear integrations | Expand after core is stable |

---

## 8. Technical Constraints

- **No legacy systems** — all integrations require OAuth 2.0 or webhook-based APIs
- **No standalone duplicates** — integrations enrich FluxDesk tools; they do not replace Jira, GitHub, or Slack
- **Encryption at rest** — all OAuth tokens encrypted with AES-256 before storage
- **Rate limiting** — webhook endpoint rate-limited per userId (60 req/min)
- **Backwards compatible** — all existing tool URLs (`/tools/:id`) remain unchanged; new sections are additive
