# FluxDesk

> The AI workspace that flows with your work.

[![Frontend](https://img.shields.io/badge/frontend-Next.js%2015-black)](#frontend)
[![Database](https://img.shields.io/badge/database-PostgreSQL%20%2B%20Prisma-336791)](#data-model)
[![Auth](https://img.shields.io/badge/auth-JWT%20%2B%20bcrypt-0f766e)](#auth-and-session-flow)
[![AI](https://img.shields.io/badge/ai-Claude%20%7C%20OpenAI%20%7C%20Gemini%20%7C%20Groq-7c3aed)](#ai-layer-and-provider-routing)

FluxDesk is a monorepo for a multi-surface AI productivity product:

- A Next.js web app and API for authenticated prompt tooling, tool execution, personalization, usage tracking, and admin features
- A VS Code extension that exposes the core toolset inside the editor
- Google Workspace integrations for Chat and Gmail via Apps Script

This README is based on the current repository state under `frontend/`, `promptos-vscode/`, and `google-integrations/`.

## Table of Contents

1. [What This Project Contains](#what-this-project-contains)
2. [Architecture Overview](#architecture-overview)
3. [Product Capabilities](#product-capabilities)
4. [Frontend](#frontend)
5. [Backend](#backend)
6. [AI Layer and Provider Routing](#ai-layer-and-provider-routing)
7. [Auth and Session Flow](#auth-and-session-flow)
8. [Data Model](#data-model)
9. [API Surface](#api-surface)
10. [Local Development](#local-development)
11. [Docker Compose](#docker-compose)
12. [Workspace Modules](#workspace-modules)
13. [Operational Notes](#operational-notes)
14. [Known Gaps and Hardening Targets](#known-gaps-and-hardening-targets)

## What This Project Contains

| Module | Purpose | Runtime |
|---|---|---|
| `frontend/` | Main product UI and API | Next.js 15, React 19, Tailwind, Prisma |
| `promptos-vscode/` | Editor-side integration | VS Code extension API |
| `google-integrations/` | Chat bot and Gmail add-on | Google Apps Script |
| `docker-compose.yml` | Local infra bootstrap | PostgreSQL + app containers |

## Architecture Overview

```mermaid
flowchart LR
    U[User] --> W[FluxDesk Web App<br/>Next.js 15]
    U --> V[VS Code Extension]
    U --> G[Google Chat / Gmail Add-on]

    W -->|API Routes| B[FluxDesk API<br/>Next.js Route Handlers]
    V -->|JWT Bearer| B
    G -->|JWT Bearer| B

    B --> A[AI Service Layer]
    B --> P[(PostgreSQL)]

    A --> C[Anthropic Claude]
    A --> O[OpenAI]
    A --> M[Google Gemini]
    A --> R[Groq]

    P --> U1[Users]
    P --> U2[Prompts]
    P --> U3[API Keys]
    P --> U4[Tool Usage]
    P --> U5[User Memory]
    P --> U6[Preferences]
    P --> U7[Refresh Tokens]
```

### High-level flow

1. A signed-in user invokes a tool from the web app, VS Code extension, or Google integration.
2. The backend authenticates the request with a JWT bearer token.
3. The tool route loads user memory and preferences, then builds a personalized system prompt.
4. The AI service selects a provider from the user’s saved keys and provider affinity history.
5. The result is returned and persisted with metadata such as provider, duration, and inferred framework.
6. Memory signals are updated asynchronously from usage and input text.

## Product Capabilities

### Web workspace

The main web application currently exposes 21 tool definitions and routes them through a generic execution endpoint.

| Category | Tools |
|---|---|
| Prompt engineering | PromptForge, Prompt Improver, Model Comparator |
| Engineering workflows | Code Review Brief, Bug -> Task, Commit Writer, Feature Spec, ADR Generator, Tech Stack Advisor, Context Handoff, Complexity Budget |
| Knowledge and learning | Concept Explainer, Flashcard Factory |
| Team and communication | Standup Writer, Meeting Mirror, Stakeholder Translator, Feedback Translator |
| Decision support | Decision Autopsy, Silence Detector, Email Intent Decoder, Work Brain Dump |

### Saved knowledge

- Prompt library with tags, starring, searching, and markdown export
- Per-user memory model that tracks:
  - inferred stack
  - inferred role and domain
  - tool frequency
  - framework affinities
  - preferred provider
  - free-form memory notes
- User preferences for default provider, theme, and sidebar state

### Additional delivery surfaces

- VS Code extension with sidebar panel and editor-selection shortcuts
- Google Chat slash-command bot
- Gmail contextual sidebar add-on

## Frontend

The web client lives in `frontend/` and is built with Next.js App Router.

### Stack

| Area | Technology |
|---|---|
| Framework | Next.js 15 |
| UI runtime | React 19 |
| Styling | Tailwind CSS |
| Motion | Framer Motion, GSAP, Lenis |
| State | Zustand |
| Data fetching | TanStack React Query |
| Forms | React Hook Form + Zod |
| Notifications | react-hot-toast |

### Route structure

| Route | Purpose |
|---|---|
| `/dashboard` | Main workspace, stats, recent tools, tool catalog |
| `/tools/[toolId]` | Tool execution surface |
| `/library` | Saved prompts |
| `/history` | Past usage history |
| `/settings` | API keys, preferences, account controls |
| `/login` | Authentication |
| `/register` | Account creation |

### Frontend shell design

The app uses route groups:

- `(app)` for authenticated workspace views wrapped by `AppShell`
- `(auth)` for login and registration views

`AppShell` provides:

- desktop sidebar
- mobile bottom navigation
- global command palette
- onboarding modal
- keyboard shortcuts

### Client-side API behavior

`frontend/src/lib/api.ts` configures:

- `Authorization: Bearer <token>` injection from local storage
- a `401` interceptor that attempts refresh via `/api/auth/refresh`
- local token persistence in browser storage

## API Layer

The API lives in `frontend/` as Next.js route handlers under `app/api/`.

### Core responsibilities

- auth and user lifecycle
- tool execution orchestration
- prompt library CRUD
- BYOK provider management
- memory and personalization state
- admin stats and user listing

### Route map

| Prefix | Responsibility |
|---|---|
| `/api/health` | Health endpoint |
| `/api/auth` | Register, login, refresh, logout, current user |
| `/api/tools` | Tool metadata, execution, usage rating, history |
| `/api/prompts` | Prompt library CRUD, export, tags, starring |
| `/api/keys` | Save, verify, list, delete BYOK provider keys |
| `/api/memory` | Stats, explicit memory updates, notes, reset |
| `/api/users` | Profile, preferences, admin listing and stats |

### Request lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant API as Next.js Route Handler
    participant Auth as JWT Middleware
    participant Memory as Memory Service
    participant Tools as Tool Definitions
    participant AI as AI Service
    participant DB as PostgreSQL

    Client->>API: POST /api/tools/:toolId/run
    API->>Auth: Verify Bearer token
    Auth-->>API: userId, role
    API->>Tools: Load tool schema and system prompt builder
    API->>Memory: Load memory context
    Memory->>DB: Fetch user memory
    Memory-->>API: personalization context
    API->>AI: callAI(userId, system, messages, provider?)
    AI->>DB: Load saved API keys and preference signals
    AI-->>API: output, provider
    API->>DB: Persist ToolUsage
    API->>Memory: Record usage asynchronously
    API-->>Client: output, provider, durationMs, usageId
```

## AI Layer and Provider Routing

The AI service layer inside `frontend/` is the provider abstraction layer.

### Supported providers

| Provider | Model used in code |
|---|---|
| Claude | `claude-opus-4-5` |
| OpenAI | `gpt-4o` |
| Gemini | `gemini-1.5-pro` |
| Groq | `llama-3.1-70b-versatile` |

### Provider selection order

1. Explicit provider from the request body
2. User memory `preferredProvider`
3. First active saved key

### BYOK flow

- API keys are stored per user in the `ApiKey` table
- listing endpoints only return hints and metadata, never the raw key
- provider format validation is partial and prefix-based

### Personalization model

Before calling the model, the backend injects a personalization prefix built from:

- inferred role
- inferred stack
- inferred domain
- preferred writing style
- top framework affinities
- recent memory notes

After each run, the system updates:

- tool frequency
- top tools
- framework affinity score
- provider affinity score
- inferred stack signals extracted from user input text

## Auth and Session Flow

### Registration and login

Registration:

- validates email, username, and password via Zod
- hashes the password with `bcrypt.hash(password, 12)`
- creates `User`, `UserMemory`, and `UserPreference` records
- generates access and refresh tokens
- persists the refresh token in the database

Login:

- fetches the user by email
- verifies `password` against `passwordHash` with `bcrypt.compare`
- generates and stores a refresh token
- deletes expired refresh tokens

### JWT middleware

The auth middleware in `frontend/`:

- expects `Authorization: Bearer <token>`
- verifies `JWT_SECRET`
- attaches `req.userId` and `req.userRole`
- gates admin routes via `requireAdmin`

### Auth flow diagram

```mermaid
flowchart TD
    A[Register or Login] --> B[Validate payload with Zod]
    B --> C[Lookup user in PostgreSQL]
    C --> D[Hash or compare password with bcrypt]
    D --> E[Generate access token]
    D --> F[Generate refresh token]
    F --> G[Persist refresh token]
    E --> H[Client stores access token]
    G --> I[/api/auth/refresh can mint new access token]
```

## Data Model

The Prisma schema lives at `frontend/prisma/schema.prisma`.

### Entity relationship diagram

```mermaid
erDiagram
    User ||--o{ ApiKey : owns
    User ||--o{ Prompt : creates
    User ||--o{ ToolUsage : generates
    User ||--|| UserMemory : has
    User ||--|| UserPreference : has
    User ||--o{ RefreshToken : receives

    User {
        string id PK
        string email UK
        string username UK
        string passwordHash
        string role
        datetime createdAt
    }

    ApiKey {
        string id PK
        string userId FK
        string provider
        string keyHash
        string keyHint
        boolean isActive
    }

    Prompt {
        string id PK
        string userId FK
        string title
        string body
        string framework
        string targetAi
        boolean isStarred
    }

    ToolUsage {
        string id PK
        string userId FK
        string toolId
        json input
        string output
        string provider
        int durationMs
        int rating
    }

    UserMemory {
        string id PK
        string userId FK
        json frameworkAffinities
        json providerAffinities
        string preferredProvider
        string[] inferredStack
    }

    UserPreference {
        string id PK
        string userId FK
        string defaultProvider
        string theme
        boolean sidebarCollapsed
    }

    RefreshToken {
        string id PK
        string userId FK
        string token UK
        datetime expiresAt
    }
```

### Important tables

| Model | Purpose |
|---|---|
| `User` | Account identity and password hash |
| `ApiKey` | User-managed model provider credentials |
| `Prompt` | Saved prompt library |
| `ToolUsage` | Auditable record of tool invocations |
| `UserMemory` | Learned personalization layer |
| `UserPreference` | Explicit UI and provider preferences |
| `RefreshToken` | Refresh-token persistence |

## API Surface

### Auth

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Authenticate with email/password |
| `POST` | `/api/auth/refresh` | Exchange refresh token |
| `POST` | `/api/auth/logout` | Revoke provided refresh token |
| `GET` | `/api/auth/me` | Get current user |

### Tools

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tools` | List tool metadata |
| `POST` | `/api/tools/:toolId/run` | Run any tool |
| `GET` | `/api/tools/:toolId/history` | Tool-specific history |
| `POST` | `/api/tools/usage/:usageId/rate` | Rate output |

### Prompt library

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/prompts` | List prompts |
| `POST` | `/api/prompts` | Create prompt |
| `PATCH` | `/api/prompts/:id` | Update prompt |
| `DELETE` | `/api/prompts/:id` | Delete prompt |
| `POST` | `/api/prompts/:id/star` | Toggle starred state |
| `GET` | `/api/prompts/export` | Export library as markdown |
| `GET` | `/api/prompts/tags` | List all tags |

### User state

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/keys` | List saved provider keys |
| `POST` | `/api/keys` | Save or update key |
| `POST` | `/api/keys/verify` | Prefix-level key validation |
| `DELETE` | `/api/keys/:provider` | Remove key |
| `GET` | `/api/memory` | Read memory context |
| `GET` | `/api/memory/stats` | Dashboard stats |
| `PATCH` | `/api/memory` | Update explicit context |
| `POST` | `/api/memory/note` | Append a memory note |
| `DELETE` | `/api/memory` | Reset memory state |
| `PATCH` | `/api/users/me` | Update profile |
| `GET` | `/api/users/preferences` | Get preferences |
| `PATCH` | `/api/users/preferences` | Update preferences |
| `GET` | `/api/users` | Admin-only user listing |
| `GET` | `/api/users/admin/stats` | Admin-only platform stats |

## Local Development

### Prerequisites

- Node.js 22 recommended
- PostgreSQL 16 compatible
- npm

### Environment files

Frontend `.env.local` example:

```env
DATABASE_URL="postgresql://fluxdesk:fluxdesk_dev@localhost:5432/fluxdesk"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_REFRESH_SECRET="your-refresh-secret-different-from-above"
NODE_ENV="development"
```

### Bootstrap

```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Generate Prisma client and apply schema
npm run db:generate
npm run db:push

# 4. Run the app
npm run dev
```

Open:

- web app: `http://localhost:3000`
- health check: `http://localhost:3000/api/health`
- Prisma Studio: `npm run db:studio`

### Suggested first-run path

1. Register a user at `/register`
2. Add at least one provider key in Settings
3. Run a tool from the dashboard
4. Save the output into the prompt library
5. Inspect `/api/memory/stats` or Prisma Studio to watch usage state accumulate

## Docker Compose

The repository includes a root `docker-compose.yml` with:

- `postgres` on `5432`
- `frontend` on `3000`

### Start the full stack

```bash
docker compose up --build
```

### Compose architecture

```mermaid
flowchart LR
    F[frontend container<br/>:3000] --> P[postgres:16-alpine<br/>:5432]
```

### Container build notes

- `frontend/Dockerfile` builds Next.js standalone output and runs `server.js`

## Workspace Modules

### `frontend/`

Primary user-facing product and API. This is where the authenticated workspace, dashboard, tool views, library, history, settings, and all Next.js route handlers live.

Key directories:

```text
frontend/src/
├── app/                  # Next.js routes, layouts, and /api route handlers
├── components/pages/     # Page-level components
├── components/shell/     # App shell, sidebar, palette, onboarding
├── components/tools/     # Tool UI pieces
├── hooks/                # React Query and feature hooks
├── lib/                  # API client and utilities
├── store/                # Zustand stores
└── types/                # Shared client types
```

### `promptos-vscode/`

VS Code extension that currently exposes the core 12-tool experience inside the editor.

Capabilities:

- sidebar panel in the Activity Bar
- editor selection actions
- right-click context menu integration
- token storage through VS Code `SecretStorage`

Important note:

- The extension docs and package metadata still describe 12 tools, while the main web/backend product now defines 21 tools. The extension currently represents a subset, not full parity.

### `google-integrations/`

Apps Script integrations for:

- Google Chat slash-command bot
- Gmail contextual add-on

Characteristics:

- JWT access token stored per user in Google User Properties
- API calls routed to the same backend
- command coverage currently focused on the original core toolset
- some newer tools are documented as "coming soon" placeholders

## Operational Notes

### Logging and errors

- backend errors go through a centralized Express error handler
- Zod validation failures return structured field-level errors
- production mode hides raw `500` error details

### Performance controls

- compressed responses
- API-level rate limiting
- tool-specific rate limiting
- indexed user-centric tables in Prisma migration output

### SEO and web metadata

The frontend root layout defines:

- metadata base
- Open Graph metadata
- Twitter metadata
- robots policy
- sitemap and robots route files

## Known Gaps and Hardening Targets

This section is intentionally explicit. It reflects the current code, not an aspirational future state.

### 1. API key storage is not production-grade

The AI service layer labels the current approach correctly: API keys are "encrypted" with reversible base64 encoding. That is obfuscation, not secure encryption.

Recommended fix:

- replace with KMS-backed encryption or a server-side secrets service
- rotate stored keys after migration
- avoid naming the field `keyHash` if the value is reversible ciphertext

### 2. Refresh-token contract is partially wired

The backend creates and stores refresh tokens, and the frontend has a refresh interceptor. But the current `register` and `login` responses return `accessToken` and `user` only, while the frontend auth store expects `refreshToken` as well.

Impact:

- automatic refresh can only work if the client has a refresh token
- current login/register flow appears contract-incomplete

### 3. Workspace integrations rely on short-lived bearer tokens

The Google integrations README already notes this. Since access tokens expire quickly, Chat/Gmail users may need to re-enter tokens often unless a longer-lived integration token or service credential model is added.

### 4. Tool-surface parity is uneven across modules

- backend/web app: 21 tools
- VS Code extension: documented 12 tools
- Google integrations: command subset with placeholders for newer tools

### 5. No automated test suite is wired at the repo root

Current package scripts cover build/dev/type generation, but there is no visible automated API or UI test harness in the repo.

## Summary

FluxDesk is already more than a prompt toy. The web app, API, editor extension, and Workspace integrations point to a cohesive product shape:

- authenticated multi-user workspace
- user-owned provider keys
- tool-driven AI workflows
- persistent prompt library
- personalization through usage memory
- multiple entry surfaces beyond the browser

The strongest part of the current architecture is the API shape: one generic tool runner, one memory layer, one provider abstraction, one data model — all colocated in the Next.js app. The next maturity step is hardening the auth/token and secret-management story so the implementation matches the product ambition.
# FluxDesk
