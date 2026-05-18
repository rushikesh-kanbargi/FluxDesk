# Ecosystem Plan A — Foundation, Shell, Projects, Activity Feed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the flat sidebar into a three-column shell (IconRail + SubPanel + Content), add the Project data model, ship a Projects section, and deliver the unified Activity Feed — everything needed before Flows and Integrations can be built.

**Architecture:** Prisma gains `Project`, `ToolSource` enum, and FKs on `ToolUsage`/`Prompt`. The shell is restructured: a fixed 52px `IconRail` replaces the collapsing `Sidebar`; a 220px `SubPanel` renders contextual nav per section. New pages live under `app/(app)/projects/` and `app/(app)/activity/`.

**Tech Stack:** Next.js 14 App Router, Prisma ORM (PostgreSQL), Zustand, React Query (TanStack), framer-motion, Tailwind, lucide-react.

---

## File Map

**Created:**
- `frontend/src/app/api/projects/route.ts` — list + create projects
- `frontend/src/app/api/projects/[id]/route.ts` — get / update / delete project
- `frontend/src/app/api/activity/route.ts` — paginated activity feed
- `frontend/src/components/shell/IconRail.tsx` — 52px left rail with section icons
- `frontend/src/components/shell/SubPanel.tsx` — 220px contextual sub-nav
- `frontend/src/hooks/useProjects.ts` — React Query hooks for projects
- `frontend/src/hooks/useActivity.ts` — React Query hook for activity feed
- `frontend/src/app/(app)/projects/page.tsx` — projects list page
- `frontend/src/app/(app)/projects/[id]/page.tsx` — project detail page
- `frontend/src/app/(app)/activity/page.tsx` — activity feed page
- `frontend/src/components/pages/ProjectsPage.tsx` — projects list UI
- `frontend/src/components/pages/ProjectDetailPage.tsx` — project detail UI
- `frontend/src/components/pages/ActivityPage.tsx` — activity feed UI

**Modified:**
- `frontend/prisma/schema.prisma` — new models, enum, FK additions
- `frontend/src/store/uiStore.ts` — add `activeRailSection`, `activeProjectId`
- `frontend/src/components/shell/AppShell.tsx` — wire IconRail + SubPanel, remove Sidebar
- `frontend/src/components/shell/Sidebar.tsx` — delete (replaced by IconRail + SubPanel)
- `frontend/src/app/api/tools/[toolId]/run/route.ts` — capture `source` + `projectId`
- `frontend/src/components/tools/ToolHeader.tsx` — add project picker dropdown
- `frontend/src/components/tools/ToolPage.tsx` — pass `activeProjectId` to run call
- `frontend/src/app/(app)/history/page.tsx` — redirect to `/activity`
- `frontend/src/components/shell/AppShell.tsx` — update mobile bottom nav items

---

## Task 1: Prisma Schema — Project Model + ToolSource Enum

**Files:**
- Modify: `frontend/prisma/schema.prisma`

- [ ] **Step 1: Add ToolSource enum, Project model, and FK additions to schema**

Replace the contents of `frontend/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  username    String?  @unique
  displayName String?
  avatarUrl   String?
  role        Role     @default(USER)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  apiKeys     ApiKey[]
  prompts     Prompt[]
  toolUsages  ToolUsage[]
  memory      UserMemory?
  preferences UserPreference?
  projects    Project[]

  @@index([email])
}

model ApiKey {
  id         String     @id @default(uuid())
  userId     String
  provider   AIProvider
  keyHash    String
  keyHint    String
  label      String?
  isActive   Boolean    @default(true)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@index([userId])
}

model Project {
  id          String    @id @default(uuid())
  userId      String
  name        String
  color       String    @default("#F5A623")
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  toolUsages  ToolUsage[]
  prompts     Prompt[]

  @@index([userId])
}

model Prompt {
  id             String   @id @default(uuid())
  userId         String
  title          String
  body           String
  framework      String?
  targetAi       String?
  tags           String[] @default([])
  isStarred      Boolean  @default(false)
  sourceToolId   String?
  usageCount     Int      @default(0)
  projectId      String?
  sharedWithTeam Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project        Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([userId, isStarred])
  @@index([projectId])
}

model ToolUsage {
  id         String     @id @default(uuid())
  userId     String
  toolId     String
  input      Json
  output     String
  provider   String?
  framework  String?
  durationMs Int?
  rating     Int?
  source     ToolSource @default(WEB)
  projectId  String?
  createdAt  DateTime   @default(now())
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  project    Project?   @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([userId, toolId])
  @@index([createdAt])
  @@index([source])
  @@index([projectId])
}

model UserMemory {
  id                  String   @id @default(uuid())
  userId              String   @unique
  frameworkAffinities Json     @default("{}")
  preferredProvider   String?
  providerAffinities  Json     @default("{}")
  topTools            String[] @default([])
  toolFrequency       Json     @default("{}")
  inferredStack       String[] @default([])
  inferredRole        String?
  inferredDomain      String?
  writingStyle        String?
  outputLength        String?
  memoryNotes         String[] @default([])
  updatedAt           DateTime @updatedAt
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserPreference {
  id               String  @id @default(uuid())
  userId           String  @unique
  defaultProvider  String  @default("claude")
  theme            String  @default("dark")
  sidebarCollapsed Boolean @default(false)
  user             User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum Role {
  USER
  ADMIN
}

enum AIProvider {
  CLAUDE
  OPENAI
  GEMINI
  GROQ
}

enum ToolSource {
  WEB
  VSCODE
  GMAIL
  CHATBOT
  FLOW
}
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd frontend
npx prisma migrate dev --name "add_project_toolsource"
```

Expected: Migration applied successfully. Prisma Client regenerated.

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd frontend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations/
git commit -m "feat(db): add Project model, ToolSource enum, FK on ToolUsage and Prompt"
```

---

## Task 2: Projects API Routes

**Files:**
- Create: `frontend/src/app/api/projects/route.ts`
- Create: `frontend/src/app/api/projects/[id]/route.ts`

- [ ] **Step 1: Create list + create endpoint**

Create `frontend/src/app/api/projects/route.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F5A623'),
  description: z.string().max(200).optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const projects = await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { toolUsages: true, prompts: true } },
        },
      })
      return NextResponse.json({ projects })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const body = await request.json()
      const data = createSchema.parse(body)
      const project = await prisma.project.create({
        data: { userId, ...data },
      })
      return NextResponse.json({ project }, { status: 201 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
```

- [ ] **Step 2: Create get / update / delete endpoint**

Create `frontend/src/app/api/projects/[id]/route.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional(),
})

async function getOwnedProject(userId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, userId } })
  if (!project) throw createError('Project not found', 404)
  return project
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    try {
      const { id } = await params
      await getOwnedProject(userId, id)
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          _count: { select: { toolUsages: true, prompts: true } },
          toolUsages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true, toolId: true, source: true,
              createdAt: true, provider: true, durationMs: true,
            },
          },
        },
      })
      return NextResponse.json({ project })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    try {
      const { id } = await params
      await getOwnedProject(userId, id)
      const body = await request.json()
      const data = updateSchema.parse(body)
      const project = await prisma.project.update({ where: { id }, data })
      return NextResponse.json({ project })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async (userId) => {
    try {
      const { id } = await params
      await getOwnedProject(userId, id)
      await prisma.project.delete({ where: { id } })
      return new NextResponse(null, { status: 204 })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Smoke-test via curl** (requires dev server running)

```bash
# Create a project (replace TOKEN with a real session token from browser devtools)
curl -s -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","color":"#34d399"}' | jq .

# List projects
curl -s http://localhost:3000/api/projects \
  -H "Authorization: Bearer TOKEN" | jq .
```

Expected: `{ project: { id: "...", name: "Test Project", ... } }` and `{ projects: [...] }`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/projects/
git commit -m "feat(api): add /api/projects CRUD routes"
```

---

## Task 3: Activity Feed API

**Files:**
- Create: `frontend/src/app/api/activity/route.ts`

- [ ] **Step 1: Create activity route**

Create `frontend/src/app/api/activity/route.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const { searchParams } = new URL(request.url)
      const platform = searchParams.get('platform')
      const projectId = searchParams.get('projectId')
      const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
      const cursor = searchParams.get('cursor')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { userId }
      if (platform && platform !== 'all') {
        where.source = platform.toUpperCase()
      }
      if (projectId) where.projectId = projectId

      const usages = await prisma.toolUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          toolId: true,
          source: true,
          projectId: true,
          provider: true,
          durationMs: true,
          rating: true,
          createdAt: true,
          output: true,
          project: { select: { id: true, name: true, color: true } },
        },
      })

      const hasMore = usages.length > limit
      const items = hasMore ? usages.slice(0, limit) : usages
      const nextCursor = hasMore ? items[items.length - 1].id : null

      return NextResponse.json({ items, nextCursor })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/activity/route.ts
git commit -m "feat(api): add /api/activity paginated feed route"
```

---

## Task 4: Tool Run Route — Source + Project Tracking

**Files:**
- Modify: `frontend/src/app/api/tools/[toolId]/run/route.ts`

- [ ] **Step 1: Add source parsing helper and update ToolUsage creation**

Edit `frontend/src/app/api/tools/[toolId]/run/route.ts`. Replace the entire file:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { callAI } from '@/lib/server/aiService'
import { getMemoryContext, buildPersonalisationContext, recordToolUsage } from '@/lib/server/memoryService'
import { TOOLS, type ToolId } from '@/lib/server/toolDefinitions'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError, createError } from '@/lib/server/errors'
import type { ToolSource } from '@prisma/client'

function parseSource(header: string | null): ToolSource {
  switch (header) {
    case 'vscode':     return 'VSCODE'
    case 'gmail-addon': return 'GMAIL'
    case 'chat-bot':   return 'CHATBOT'
    default:           return 'WEB'
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  return withAuth(request, async (userId) => {
    try {
      const { toolId } = await params
      const tool = TOOLS[toolId as ToolId]
      if (!tool) throw createError('Unknown tool', 404)

      const body = await request.json()
      const { projectId, ...restBody } = body
      const input = tool.schema.parse(restBody)

      const memCtx = await getMemoryContext(userId)
      const personalisation = buildPersonalisationContext(memCtx)
      const system = tool.buildSystem(personalisation)
      const userMessage = buildUserMessage(toolId as ToolId, input)

      const start = Date.now()
      const { text, provider } = await callAI({
        userId,
        system,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 1500,
        preferredProvider: restBody.preferredProvider ?? restBody.provider,
      })
      const durationMs = Date.now() - start

      const source = parseSource(request.headers.get('X-FluxDesk-Client'))

      const usage = await prisma.toolUsage.create({
        data: {
          userId,
          toolId,
          input: JSON.parse(JSON.stringify(input)),
          output: text,
          provider,
          framework: extractFramework(text, toolId),
          durationMs,
          source,
          ...(projectId ? { projectId } : {}),
        },
      })

      recordToolUsage(
        userId,
        toolId,
        extractFramework(text, toolId) ?? undefined,
        provider,
        JSON.stringify(input)
      ).catch(() => {})

      return NextResponse.json({ output: text, usageId: usage.id, provider, durationMs })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}

function extractFramework(text: string, toolId: string): string | null {
  if (toolId === 'forge') {
    try {
      const j = JSON.parse(text.replace(/```json|```/g, '').trim())
      return j.framework || null
    } catch {
      return null
    }
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUserMessage(toolId: ToolId, input: any): string {
  switch (toolId) {
    case 'forge':
      return `Raw idea: ${input.idea}\nCategory hint: ${input.category || 'auto-detect'}\nTarget AI: ${input.targetAi || 'Claude'}\nFramework override: ${input.framework || 'auto-pick best'}`
    case 'improver':
      return `Prompt to improve:\n${input.prompt}\n\nContext/purpose: ${input.context || 'not specified'}`
    case 'codeReview':
      return `Language/Framework: ${input.language || 'detect from code'}\nFocus: ${input.focus || 'general'}\n\nCode:\n\`\`\`\n${input.code}\n\`\`\``
    case 'bugTask':
      return `Product: ${input.product || 'not specified'}\nTicket format: ${input.format || 'linear'}\n\nRaw report:\n${input.rawReport}`
    case 'commit':
      return `Type hint: ${input.typeHint || 'auto-detect'}\nScope: ${input.scope || 'none'}\n\nDiff/description:\n${input.diff}`
    case 'featureSpec':
      return `Feature: ${input.idea}\nProduct: ${input.product || 'not specified'}\nAudience: ${input.audience || 'team'}`
    case 'standup':
      return `Yesterday: ${input.yesterday || 'not provided'}\nToday: ${input.today || 'not provided'}\nBlockers: ${input.blockers || 'none'}\nChannel: ${input.team || 'general'}\nTone: ${input.tone || 'concise'}`
    case 'adr':
      return `Decision to document: ${input.decision}\nContext: ${input.context || 'not provided'}\nOptions being considered: ${input.options || 'not specified'}`
    case 'techStack':
      return `Project type: ${input.projectType}\nTeam size: ${input.teamSize || 'not specified'}\nTimeline: ${input.timeline || 'not specified'}\nConstraints: ${input.constraints || 'none'}`
    case 'conceptExplainer':
      return `Concept: ${input.concept}\nDesired level: ${input.level || 'intermediate'}`
    case 'flashcards':
      return `Generate ${input.count || 8} flashcards. Style: ${input.style || 'qa'}.\n\nSource material:\n${input.content}`
    case 'compare':
      return `Prompt to compare across models:\n${input.prompt}\n\nContext: ${input.context || 'not provided'}`
    case 'meetingMirror':
      return `Meeting type: ${input.meetingType || 'not specified'}\n\nTranscript:\n${input.transcript}`
    case 'stakeholderTranslator':
      return `Audiences to rewrite for: ${input.audiences || 'all five (ceo, engineer, sales, customer, board)'}\n\nContent to translate:\n${input.content}`
    case 'decisionAutopsy':
      return `Decision: ${input.decision}\n\nContext: ${input.context || 'not provided'}`
    case 'silenceDetector':
      return `Medium: ${input.medium || 'not specified'}\n\nThread / transcript:\n${input.thread}`
    case 'complexityBudget':
      return `Team size: ${input.teamSize || 'not specified'}\n\nProject plan / roadmap:\n${input.plan}`
    case 'contextHandoff':
      return `Task: ${input.task}\n\nProgress so far:\n${input.progress}\n\nOpen items: ${input.openItems || 'not specified'}`
    case 'emailIntentDecoder':
      return `Relationship context: ${input.relationship || 'not specified'}\n\nEmail:\n${input.email}`
    case 'workBrainDump':
      return `Brain dump:\n${input.dump}`
    case 'feedbackTranslator':
      return `Context: ${input.context || 'not specified'}\n\nFeedback received:\n${input.feedback}`
    default:
      return JSON.stringify(input)
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/tools/
git commit -m "feat(api): capture source and projectId on every tool run"
```

---

## Task 5: uiStore Additions

**Files:**
- Modify: `frontend/src/store/uiStore.ts`

- [ ] **Step 1: Add activeRailSection and activeProjectId**

Replace the entire contents of `frontend/src/store/uiStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AIProvider = 'claude' | 'openai' | 'gemini' | 'groq'

export type RailSection = 'home' | 'projects' | 'tools' | 'library' | 'settings'

interface UIState {
  // Sidebar (legacy — used by mobile nav only)
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Active AI provider
  activeProvider: AIProvider
  setActiveProvider: (provider: AIProvider) => void

  // Onboarding
  onboardingComplete: boolean
  setOnboardingComplete: (complete: boolean) => void
  onboardingStep: number
  setOnboardingStep: (step: number) => void

  // Keyboard shortcuts modal
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void

  // Recent tools (for "continue where you left off")
  recentTools: string[]
  addRecentTool: (toolId: string) => void

  // Shell — active rail section
  activeRailSection: RailSection
  setActiveRailSection: (section: RailSection) => void

  // Active project context (sent with every tool run)
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      activeProvider: 'claude',
      setActiveProvider: (provider) => set({ activeProvider: provider }),

      onboardingComplete: false,
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      onboardingStep: 0,
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      shortcutsOpen: false,
      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

      recentTools: [],
      addRecentTool: (toolId) =>
        set((s) => ({
          recentTools: [toolId, ...s.recentTools.filter((t) => t !== toolId)].slice(0, 5),
        })),

      activeRailSection: 'home',
      setActiveRailSection: (section) => set({ activeRailSection: section }),

      activeProjectId: null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    {
      name: 'fluxdesk-ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activeProvider: state.activeProvider,
        onboardingComplete: state.onboardingComplete,
        recentTools: state.recentTools,
        activeRailSection: state.activeRailSection,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
)
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/uiStore.ts
git commit -m "feat(store): add activeRailSection and activeProjectId to uiStore"
```

---

## Task 6: React Query Hooks — Projects + Activity

**Files:**
- Create: `frontend/src/hooks/useProjects.ts`
- Create: `frontend/src/hooks/useActivity.ts`

- [ ] **Step 1: Create useProjects hook**

Create `frontend/src/hooks/useProjects.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Project {
  id: string
  name: string
  color: string
  description?: string | null
  createdAt: string
  updatedAt: string
  _count?: { toolUsages: number; prompts: number }
}

export interface ProjectDetail extends Project {
  toolUsages: Array<{
    id: string
    toolId: string
    source: string
    createdAt: string
    provider: string | null
    durationMs: number | null
  }>
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      apiFetch<{ projects: Project[] }>('/api/projects').then((d) => d.projects),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () =>
      apiFetch<{ project: ProjectDetail }>(`/api/projects/${id}`).then((d) => d.project),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; description?: string }) =>
      apiFetch<{ project: Project }>('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name?: string; color?: string; description?: string }
    }) =>
      apiFetch<{ project: Project }>(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/projects/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Delete failed')
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
```

- [ ] **Step 2: Create useActivity hook**

Create `frontend/src/hooks/useActivity.ts`:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

export interface ActivityItem {
  id: string
  toolId: string
  source: string
  projectId: string | null
  provider: string | null
  durationMs: number | null
  rating: number | null
  createdAt: string
  output: string
  project: { id: string; name: string; color: string } | null
}

interface ActivityPage {
  items: ActivityItem[]
  nextCursor: string | null
}

export function useActivity(filters: { platform?: string; projectId?: string } = {}) {
  return useInfiniteQuery<ActivityPage, Error, ActivityPage, string[], string | null>({
    queryKey: ['activity', filters.platform ?? 'all', filters.projectId ?? ''],
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' })
      if (filters.platform && filters.platform !== 'all') params.set('platform', filters.platform)
      if (filters.projectId) params.set('projectId', filters.projectId)
      if (pageParam) params.set('cursor', pageParam)

      const res = await fetch(`/api/activity?${params}`)
      if (!res.ok) throw new Error('Failed to fetch activity')
      return res.json() as Promise<ActivityPage>
    },
    getNextPageParam: (last) => last.nextCursor,
  })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useProjects.ts frontend/src/hooks/useActivity.ts
git commit -m "feat(hooks): add useProjects and useActivity React Query hooks"
```

---

## Task 7: IconRail Component

**Files:**
- Create: `frontend/src/components/shell/IconRail.tsx`

- [ ] **Step 1: Create IconRail**

Create `frontend/src/components/shell/IconRail.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Folder,
  Grid3X3,
  Book,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn, Tooltip } from '@/components/ui'
import { useUIStore, type RailSection } from '@/store/uiStore'

interface RailItem {
  id: RailSection
  icon: LucideIcon
  label: string
  href: string
}

const RAIL_TOP: RailItem[] = [
  { id: 'home',     icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { id: 'projects', icon: Folder,          label: 'Projects',  href: '/projects' },
  { id: 'tools',    icon: Grid3X3,         label: 'All Tools', href: '/dashboard' },
  { id: 'library',  icon: Book,            label: 'Library',   href: '/library' },
]

const RAIL_BOTTOM: RailItem[] = [
  { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
]

function sectionFromPath(pathname: string): RailSection {
  if (pathname.startsWith('/projects'))  return 'projects'
  if (pathname.startsWith('/tools'))     return 'tools'
  if (pathname.startsWith('/library'))   return 'library'
  if (pathname.startsWith('/settings'))  return 'settings'
  return 'home'
}

export function IconRail() {
  const pathname = usePathname()
  const activeSection = useUIStore((s) => s.activeRailSection)
  const setActiveRailSection = useUIStore((s) => s.setActiveRailSection)

  // Sync rail with URL on navigation
  useEffect(() => {
    setActiveRailSection(sectionFromPath(pathname))
  }, [pathname, setActiveRailSection])

  function RailButton({ item }: { item: RailItem }) {
    const Icon = item.icon
    const isActive = activeSection === item.id

    return (
      <Tooltip content={item.label} side="right" delay={200}>
        <Link
          href={item.href}
          onClick={() => setActiveRailSection(item.id)}
          className={cn(
            'relative flex items-center justify-center w-9 h-9 mx-auto rounded-lg',
            'transition-colors duration-150',
            isActive
              ? 'bg-[rgba(245,166,35,0.12)] text-[#F5A623]'
              : 'text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.7)]',
          )}
        >
          <Icon size={16} />
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-0.5 h-5 bg-[#F5A623] rounded-r-full" />
          )}
        </Link>
      </Tooltip>
    )
  }

  return (
    <div className="flex flex-col h-full w-[52px] flex-shrink-0 bg-[#111113] border-r border-[rgba(255,255,255,0.06)]">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <Tooltip content="FluxDesk" side="right" delay={200}>
          <Link href="/dashboard">
            <div className="w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center hover:bg-[rgba(245,166,35,0.22)] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 4.5V9.5L7 13L2 9.5V4.5L7 1Z" fill="#F5A623" fillOpacity="0.9" />
                <path d="M7 4L9.5 5.5V8.5L7 10L4.5 8.5V5.5L7 4Z" fill="#09090b" />
              </svg>
            </div>
          </Link>
        </Tooltip>
      </div>

      {/* Top items */}
      <div className="flex flex-col gap-1 py-3 flex-1">
        {RAIL_TOP.map((item) => (
          <RailButton key={item.id} item={item} />
        ))}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col gap-1 py-3 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
        {RAIL_BOTTOM.map((item) => (
          <RailButton key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shell/IconRail.tsx
git commit -m "feat(shell): add IconRail component (52px fixed left rail)"
```

---

## Task 8: SubPanel Component

**Files:**
- Create: `frontend/src/components/shell/SubPanel.tsx`

- [ ] **Step 1: Create SubPanel**

Create `frontend/src/components/shell/SubPanel.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
  Plus, Activity, LayoutDashboard, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/components/ui'
import { useUIStore, type RailSection } from '@/store/uiStore'
import { useProjects } from '@/hooks/useProjects'
import { useAuthStore } from '@/store/authStore'

// ── Tool nav (replaces Sidebar's NAV_GROUPS) ───────────────────
interface NavItem { id: string; label: string; href: string; icon: LucideIcon; isNew?: boolean }
interface NavGroup { label: string; color: string; items: NavItem[] }

const TOOL_GROUPS: NavGroup[] = [
  {
    label: 'Prompting', color: '#F5A623',
    items: [
      { id: 'forge',    label: 'PromptForge',     href: '/tools/forge',    icon: Zap },
      { id: 'improver', label: 'Prompt Improver', href: '/tools/improver', icon: Sparkles },
    ],
  },
  {
    label: 'Development', color: '#34d399',
    items: [
      { id: 'code-review', label: 'Code Review',   href: '/tools/code-review', icon: GitPullRequest },
      { id: 'bug-task',    label: 'Bug → Task',    href: '/tools/bug-task',    icon: Bug },
      { id: 'commit',      label: 'Commit Writer', href: '/tools/commit',      icon: GitCommit },
      { id: 'adr',         label: 'ADR Generator', href: '/tools/adr',         icon: FileText },
    ],
  },
  {
    label: 'Planning', color: '#38bdf8',
    items: [
      { id: 'feature-spec', label: 'Feature Spec',       href: '/tools/feature-spec', icon: ClipboardList },
      { id: 'standup',      label: 'Standup Writer',     href: '/tools/standup',      icon: Users },
      { id: 'tech-stack',   label: 'Tech Stack Advisor', href: '/tools/tech-stack',   icon: Layers },
    ],
  },
  {
    label: 'Learning', color: '#a78bfa',
    items: [
      { id: 'concept-explainer', label: 'Concept Explainer', href: '/tools/concept-explainer', icon: BookOpen },
      { id: 'flashcards',        label: 'Flashcard Factory', href: '/tools/flashcards',        icon: CreditCard },
      { id: 'compare',           label: 'Model Comparator',  href: '/tools/compare',           icon: BarChart2 },
    ],
  },
  {
    label: 'Workplace', color: '#fb923c',
    items: [
      { id: 'meeting-mirror',         label: 'Meeting Mirror',         href: '/tools/meeting-mirror',         icon: Video,          isNew: true },
      { id: 'stakeholder-translator', label: 'Stakeholder Translator', href: '/tools/stakeholder-translator', icon: MessageSquare,  isNew: true },
      { id: 'decision-autopsy',       label: 'Decision Autopsy',       href: '/tools/decision-autopsy',       icon: AlertTriangle,  isNew: true },
      { id: 'silence-detector',       label: 'Silence Detector',       href: '/tools/silence-detector',       icon: EyeOff },
      { id: 'complexity-budget',      label: 'Complexity Budget',      href: '/tools/complexity-budget',      icon: TrendingUp },
      { id: 'context-handoff',        label: 'Context Handoff',        href: '/tools/context-handoff',        icon: ArrowRightLeft, isNew: true },
      { id: 'email-intent-decoder',   label: 'Email Intent Decoder',   href: '/tools/email-intent-decoder',   icon: Mail,           isNew: true },
      { id: 'work-brain-dump',        label: 'Work Brain Dump',        href: '/tools/work-brain-dump',        icon: Brain },
      { id: 'feedback-translator',    label: 'Feedback Translator',    href: '/tools/feedback-translator',    icon: MessageCircle,  isNew: true },
    ],
  },
]

const SECTION_TITLES: Record<RailSection, string> = {
  home:     'Dashboard',
  projects: 'Projects',
  tools:    'All Tools',
  library:  'Library',
  settings: 'Settings',
}

// ── Sub-panels per section ─────────────────────────────────────

function HomeSubPanel({ pathname }: { pathname: string }) {
  const items = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/activity',  icon: Activity,        label: 'Activity Feed' },
  ]
  return (
    <div className="px-2 space-y-0.5">
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
              active
                ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
                : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
            )}
          >
            <Icon size={13} className="flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}

function ProjectsSubPanel({ pathname }: { pathname: string }) {
  const { data: projects, isLoading } = useProjects()
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const activeProjectId = useUIStore((s) => s.activeProjectId)

  return (
    <div className="px-2 space-y-0.5">
      <Link
        href="/projects"
        className={cn(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
          pathname === '/projects'
            ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
            : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
        )}
      >
        All Projects
      </Link>

      {isLoading && (
        <div className="px-2 py-2 text-[10px] text-[rgba(255,255,255,0.25)]">Loading…</div>
      )}

      {projects?.map((p) => {
        const isActive = pathname === `/projects/${p.id}`
        const isSelected = activeProjectId === p.id
        return (
          <div key={p.id} className="flex items-center gap-1">
            <Link
              href={`/projects/${p.id}`}
              className={cn(
                'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                isActive
                  ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
            {/* Context selector — click to make this the active project for tool runs */}
            <button
              onClick={() => setActiveProjectId(isSelected ? null : p.id)}
              className={cn(
                'w-4 h-4 rounded border text-[9px] flex items-center justify-center transition-colors flex-shrink-0',
                isSelected
                  ? 'border-[#F5A623] bg-[rgba(245,166,35,0.15)] text-[#F5A623]'
                  : 'border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.25)] hover:border-[rgba(255,255,255,0.3)]',
              )}
              title={isSelected ? 'Remove from context' : 'Set as active project'}
            >
              ✓
            </button>
          </div>
        )
      })}

      <Link
        href="/projects"
        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors mt-1 border border-dashed border-[rgba(255,255,255,0.08)]"
      >
        <Plus size={11} />
        New project
      </Link>
    </div>
  )
}

function ToolsSubPanel({ pathname }: { pathname: string }) {
  return (
    <div>
      {TOOL_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <div className="px-4 py-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: group.color, opacity: 0.6 }}
            >
              {group.label}
            </span>
          </div>
          {group.items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2.5 mx-2 my-0.5 px-2 py-1.5 rounded-md text-xs transition-colors',
                  isActive
                    ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
                    : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
                )}
              >
                <Icon size={13} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.isNew && (
                  <span className="ml-auto inline-flex items-center px-1 py-px rounded text-[9px] font-semibold bg-[rgba(245,166,35,0.15)] text-[#F5A623] border border-[rgba(245,166,35,0.25)]">
                    NEW
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function LibrarySubPanel({ pathname }: { pathname: string }) {
  return (
    <div className="px-2">
      <Link
        href="/library"
        className={cn(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
          pathname === '/library'
            ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
            : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
        )}
      >
        Saved Prompts
      </Link>
    </div>
  )
}

function SettingsSubPanel({ pathname }: { pathname: string }) {
  const signOut = useAuthStore((s) => s.signOut)
  const router = useRouter()

  return (
    <div className="px-2 space-y-0.5">
      <Link
        href="/settings"
        className={cn(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors',
          pathname === '/settings'
            ? 'bg-[rgba(245,166,35,0.10)] text-[#F5A623] font-medium'
            : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
        )}
      >
        Preferences
      </Link>
      <button
        onClick={() => signOut().then(() => router.push('/login'))}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-[rgba(255,255,255,0.5)] hover:text-rose-400 hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
      >
        Sign out
      </button>
    </div>
  )
}

// ── SubPanel ───────────────────────────────────────────────────
export function SubPanel() {
  const pathname = usePathname()
  const activeSection = useUIStore((s) => s.activeRailSection)
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex flex-col h-full w-[220px] flex-shrink-0 bg-[#111113] border-r border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Section header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <span className="text-xs font-semibold text-white">
          {SECTION_TITLES[activeSection]}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-2">
        {activeSection === 'home'     && <HomeSubPanel     pathname={pathname} />}
        {activeSection === 'projects' && <ProjectsSubPanel pathname={pathname} />}
        {activeSection === 'tools'    && <ToolsSubPanel    pathname={pathname} />}
        {activeSection === 'library'  && <LibrarySubPanel  pathname={pathname} />}
        {activeSection === 'settings' && <SettingsSubPanel pathname={pathname} />}
      </div>

      {/* User row at bottom */}
      <div className="border-t border-[rgba(255,255,255,0.06)] p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center text-[10px] font-semibold text-[#F5A623] flex-shrink-0">
            {user?.user_metadata?.name?.[0]?.toUpperCase() ??
              user?.email?.[0]?.toUpperCase() ??
              'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'User'}
            </div>
            <div className="text-[10px] text-[rgba(255,255,255,0.3)] truncate">
              {user?.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shell/SubPanel.tsx
git commit -m "feat(shell): add SubPanel component (220px contextual nav)"
```

---

## Task 9: AppShell Rewire

**Files:**
- Modify: `frontend/src/components/shell/AppShell.tsx`
- Modify: `frontend/src/app/(app)/history/page.tsx`

- [ ] **Step 1: Replace AppShell to use IconRail + SubPanel**

Replace the entire contents of `frontend/src/components/shell/AppShell.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/components/ui'
import { IconRail } from './IconRail'
import { SubPanel } from './SubPanel'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { OnboardingModal } from './OnboardingModal'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { LayoutDashboard, Grid3X3, Book, Settings, Search } from 'lucide-react'

const MOBILE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/projects',  icon: Grid3X3,         label: 'Projects' },
  { href: '/library',   icon: Book,            label: 'Library' },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
] as const

function MobileBottomNav() {
  const pathname = usePathname()
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#111113] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-around px-2">
      {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-xl',
              'transition-colors duration-150',
              active ? 'text-[#F5A623]' : 'text-[rgba(255,255,255,0.4)]',
            )}
          >
            <Icon size={18} />
            <span className="text-[10px]">{label}</span>
          </Link>
        )
      })}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[rgba(255,255,255,0.4)] transition-colors hover:text-[rgba(255,255,255,0.7)]"
      >
        <Search size={18} />
        <span className="text-[10px]">Search</span>
      </button>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, init } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  useKeyboardShortcuts()

  if (loading) return null

  return (
    <div className="flex h-dvh overflow-hidden bg-[#09090b]">
      {/* Desktop three-column shell */}
      <div className="hidden md:flex">
        <IconRail />
        <SubPanel />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden min-w-0 flex flex-col pb-16 md:pb-0">
        <Topbar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Shared modals */}
      <CommandPalette />
      <OnboardingModal />
      <KeyboardShortcutsModal />
    </div>
  )
}
```

- [ ] **Step 2: Redirect /history → /activity**

Replace the contents of `frontend/src/app/(app)/history/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function HistoryPage() {
  redirect('/activity')
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Start dev server and verify shell renders correctly**

```bash
cd frontend && npm run dev
```

Open http://localhost:3000/dashboard in a browser.

Expected:
- Left side: 52px icon rail with Home/Projects/Tools/Library icons + Settings at bottom
- Next to it: 220px sub-panel showing "Dashboard" header, with Dashboard + Activity Feed links
- Clicking each rail icon changes the sub-panel content
- Clicking "All Tools" shows the full tool list in sub-panel (same as old sidebar)
- URL /tools/forge → rail highlights Tools, sub-panel shows tool list with forge active

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shell/AppShell.tsx frontend/src/app/(app)/history/page.tsx
git commit -m "feat(shell): replace Sidebar with IconRail + SubPanel three-column layout"
```

- [ ] **Step 6: Delete old Sidebar file**

```bash
git rm frontend/src/components/shell/Sidebar.tsx
git commit -m "chore(shell): remove Sidebar.tsx (replaced by IconRail + SubPanel)"
```

---

## Task 10: Projects Pages

**Files:**
- Create: `frontend/src/app/(app)/projects/page.tsx`
- Create: `frontend/src/app/(app)/projects/[id]/page.tsx`
- Create: `frontend/src/components/pages/ProjectsPage.tsx`
- Create: `frontend/src/components/pages/ProjectDetailPage.tsx`

- [ ] **Step 1: Create projects list page route**

Create `frontend/src/app/(app)/projects/page.tsx`:

```typescript
export { default } from '@/components/pages/ProjectsPage'
```

Create `frontend/src/app/(app)/projects/[id]/page.tsx`:

```typescript
export { default } from '@/components/pages/ProjectDetailPage'
```

- [ ] **Step 2: Create ProjectsPage component**

Create `frontend/src/components/pages/ProjectsPage.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Folder } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, Button, ErrorAlert, cn } from '@/components/ui'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useUIStore } from '@/store/uiStore'
import toast from 'react-hot-toast'

const PRESET_COLORS = [
  '#F5A623', '#34d399', '#38bdf8', '#a78bfa',
  '#fb923c', '#f472b6', '#e879f9', '#22d3ee',
]

function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, color: string, description?: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#F5A623')
  const [description, setDescription] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4 rounded-xl bg-[#1a1a1c] border border-[rgba(255,255,255,0.08)] p-6 shadow-2xl"
      >
        <h2 className="text-sm font-semibold text-white mb-4">New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[rgba(255,255,255,0.5)] mb-1.5 block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onCreate(name.trim(), color, description || undefined)
                if (e.key === 'Escape') onClose()
              }}
              placeholder="My project…"
              className="w-full h-9 px-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(245,166,35,0.4)]"
            />
          </div>

          <div>
            <label className="text-xs text-[rgba(255,255,255,0.5)] mb-1.5 block">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-white scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[rgba(255,255,255,0.5)] mb-1.5 block">
              Description <span className="opacity-50">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this project about?"
              className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(245,166,35,0.4)] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), color, description || undefined)}
          >
            Create
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const { data: projects, isLoading, error } = useProjects()
  const createProject = useCreateProject()
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)

  async function handleCreate(name: string, color: string, description?: string) {
    try {
      const { project } = await createProject.mutateAsync({ name, color, description })
      setShowModal(false)
      toast.success(`"${project.name}" created`)
      router.push(`/projects/${project.id}`)
    } catch {
      toast.error('Failed to create project')
    }
  }

  if (error) return <ErrorAlert message="Failed to load projects" />

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Projects</h1>
          <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
            Organise your tool runs, flows, and saved prompts
          </p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={13} />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-[rgba(255,255,255,0.03)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {projects?.map((project) => (
            <motion.div
              key={project.id}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            >
              <Card
                padding="md"
                className="cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-colors group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-sm font-medium text-white truncate">{project.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveProjectId(project.id)
                      toast.success(`"${project.name}" set as active project`)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.4)] hover:text-white hover:border-[rgba(255,255,255,0.3)] transition-all"
                  >
                    Set active
                  </button>
                </div>

                {project.description && (
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex gap-4 text-xs text-[rgba(255,255,255,0.3)]">
                  <span>{project._count?.toolUsages ?? 0} runs</span>
                  <span>{project._count?.prompts ?? 0} prompts</span>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* New project dashed card */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <button
              onClick={() => setShowModal(true)}
              className="w-full h-full min-h-[120px] rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center gap-2 text-xs text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
            >
              <Plus size={16} />
              New Project
            </button>
          </motion.div>
        </motion.div>
      )}

      {projects?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Folder size={32} className="mx-auto mb-3 text-[rgba(255,255,255,0.15)]" />
          <p className="text-sm text-[rgba(255,255,255,0.4)]">No projects yet</p>
          <p className="text-xs text-[rgba(255,255,255,0.25)] mt-1">
            Create a project to organise your work
          </p>
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ProjectDetailPage component**

Create `frontend/src/components/pages/ProjectDetailPage.tsx`:

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Zap, BookMarked } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, ErrorAlert, Badge, cn } from '@/components/ui'
import { useProject } from '@/hooks/useProjects'

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  WEB:     { label: 'Web',     color: '#38bdf8' },
  VSCODE:  { label: 'VS Code', color: '#a78bfa' },
  GMAIL:   { label: 'Gmail',   color: '#34d399' },
  CHATBOT: { label: 'Chat',    color: '#fb923c' },
  FLOW:    { label: 'Flow',    color: '#F5A623' },
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: project, isLoading, error } = useProject(id)

  if (error) return <ErrorAlert message="Project not found" />

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="h-8 w-48 bg-[rgba(255,255,255,0.05)] animate-pulse rounded mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-[rgba(255,255,255,0.03)] animate-pulse rounded-xl border border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) return null

  const source = SOURCE_LABELS

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
        </div>
        {project.updatedAt && (
          <span className="text-xs text-[rgba(255,255,255,0.3)] ml-auto">
            Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-[rgba(255,255,255,0.5)] mb-6">{project.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Zap,       label: 'Tool Runs',     value: project._count?.toolUsages ?? 0 },
          { icon: BookMarked, label: 'Saved Prompts', value: project._count?.prompts ?? 0 },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} padding="md">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className="text-[rgba(255,255,255,0.3)]" />
              <span className="text-xs text-[rgba(255,255,255,0.4)]">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Recent Activity</h2>
        {project.toolUsages.length === 0 ? (
          <div className="text-center py-10 text-xs text-[rgba(255,255,255,0.3)]">
            No tool runs in this project yet
          </div>
        ) : (
          <div className="space-y-1">
            {project.toolUsages.map((usage) => {
              const src = SOURCE_LABELS[usage.source] ?? SOURCE_LABELS.WEB
              return (
                <div
                  key={usage.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ color: src.color, backgroundColor: `${src.color}15` }}
                  >
                    {src.label}
                  </span>
                  <span className="text-xs text-white font-medium">{usage.toolId}</span>
                  {usage.provider && (
                    <span className="text-[10px] text-[rgba(255,255,255,0.3)] ml-auto mr-2">
                      {usage.provider}
                    </span>
                  )}
                  <span className="text-[10px] text-[rgba(255,255,255,0.3)] flex items-center gap-1">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(usage.createdAt), { addSuffix: true })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify in browser**

Navigate to http://localhost:3000/projects

Expected:
- Projects list page renders with "New Project" button
- Click "New Project" → modal opens with name input + colour picker
- Create a project → redirected to the project detail page
- Detail page shows stats (0 runs, 0 prompts) and empty activity section

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/(app)/projects/ frontend/src/components/pages/ProjectsPage.tsx frontend/src/components/pages/ProjectDetailPage.tsx
git commit -m "feat(projects): add Projects list and detail pages"
```

---

## Task 11: Activity Feed Page

**Files:**
- Create: `frontend/src/app/(app)/activity/page.tsx`
- Create: `frontend/src/components/pages/ActivityPage.tsx`

- [ ] **Step 1: Create activity page route**

Create `frontend/src/app/(app)/activity/page.tsx`:

```typescript
export { default } from '@/components/pages/ActivityPage'
```

- [ ] **Step 2: Create ActivityPage component**

Create `frontend/src/components/pages/ActivityPage.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { Clock, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, cn } from '@/components/ui'
import { useActivity, type ActivityItem } from '@/hooks/useActivity'
import { useProjects } from '@/hooks/useProjects'

const SOURCE_META: Record<string, { label: string; color: string }> = {
  WEB:     { label: 'Web',     color: '#38bdf8' },
  VSCODE:  { label: 'VS Code', color: '#a78bfa' },
  GMAIL:   { label: 'Gmail',   color: '#34d399' },
  CHATBOT: { label: 'Chat',    color: '#fb923c' },
  FLOW:    { label: 'Flow',    color: '#F5A623' },
}

const PLATFORM_FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'web',     label: 'Web' },
  { id: 'vscode',  label: 'VS Code' },
  { id: 'gmail',   label: 'Gmail' },
  { id: 'chatbot', label: 'Chat Bot' },
  { id: 'flow',    label: 'Flows' },
]

function groupByDate(items: ActivityItem[]): Array<{ label: string; items: ActivityItem[] }> {
  const groups = new Map<string, ActivityItem[]>()

  for (const item of items) {
    const date = new Date(item.createdAt)
    const key = isToday(date)
      ? 'Today'
      : isYesterday(date)
      ? 'Yesterday'
      : format(date, 'MMMM d, yyyy')

    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const src = SOURCE_META[item.source] ?? SOURCE_META.WEB
  const preview = item.output.slice(0, 120).replace(/\n/g, ' ')

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0"
        style={{ color: src.color, backgroundColor: `${src.color}15` }}
      >
        {src.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-white">{item.toolId}</span>
          {item.project && (
            <span
              className="text-[9px] px-1.5 py-px rounded-full font-medium"
              style={{
                color: item.project.color,
                backgroundColor: `${item.project.color}15`,
                border: `1px solid ${item.project.color}30`,
              }}
            >
              {item.project.name}
            </span>
          )}
          {item.provider && (
            <span className="text-[10px] text-[rgba(255,255,255,0.25)]">{item.provider}</span>
          )}
        </div>
        <p className="text-xs text-[rgba(255,255,255,0.4)] truncate">{preview}</p>
      </div>
      <span className="text-[10px] text-[rgba(255,255,255,0.3)] flex-shrink-0 flex items-center gap-1 mt-0.5">
        <Clock size={10} />
        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
      </span>
    </div>
  )
}

export default function ActivityPage() {
  const [platform, setPlatform] = useState('all')
  const [projectId, setProjectId] = useState('')

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivity({
    platform: platform === 'all' ? undefined : platform,
    projectId: projectId || undefined,
  })

  const { data: projects } = useProjects()

  const allItems = data?.pages.flatMap((p) => p.items) ?? []
  const groups = groupByDate(allItems)

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Activity Feed</h1>
        <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
          Every tool run across all your platforms
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {PLATFORM_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setPlatform(f.id)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              platform === f.id
                ? 'bg-[rgba(245,166,35,0.15)] text-[#F5A623] border border-[rgba(245,166,35,0.3)]'
                : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}

        {projects && projects.length > 0 && (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="ml-auto px-3 py-1 rounded-full text-xs bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] focus:outline-none focus:border-[rgba(245,166,35,0.3)]"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-[rgba(255,255,255,0.03)] animate-pulse" />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-16">
          <Activity size={32} className="mx-auto mb-3 text-[rgba(255,255,255,0.15)]" />
          <p className="text-sm text-[rgba(255,255,255,0.4)]">No activity yet</p>
          <p className="text-xs text-[rgba(255,255,255,0.25)] mt-1">
            Run a tool to see it appear here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.3)] mb-2 px-1">
                {group.label}
              </div>
              <Card padding="none">
                {group.items.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </Card>
            </div>
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-2 text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify in browser**

Navigate to http://localhost:3000/activity

Expected:
- Filter pills at top (All / Web / VS Code / Gmail / Chat Bot / Flows)
- Project filter dropdown if any projects exist
- Feed grouped by Today / Yesterday / older
- Each row: coloured source badge, tool name, project tag if set, output preview, timestamp
- Navigating to /history redirects to /activity

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(app)/activity/ frontend/src/components/pages/ActivityPage.tsx
git commit -m "feat(activity): add unified Activity Feed page with platform and project filters"
```

---

## Task 12: Project Picker in Tool Header

**Files:**
- Modify: `frontend/src/components/tools/ToolHeader.tsx`
- Modify: `frontend/src/components/tools/ToolPage.tsx`

- [ ] **Step 1: Add project picker to ToolHeader**

Replace the entire contents of `frontend/src/components/tools/ToolHeader.tsx`:

```tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { History, ChevronDown, Folder, type LucideIcon } from 'lucide-react'
import {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
} from 'lucide-react'
import {
  Button, Badge, Tooltip,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  cn,
} from '@/components/ui/index'
import { useUIStore } from '@/store/uiStore'
import { AI_PROVIDERS, type AIProvider } from '@/types'
import { useProjects } from '@/hooks/useProjects'
import type { ToolConfig } from './configs'

const ICON_MAP: Record<string, LucideIcon> = {
  Zap, Sparkles, GitPullRequest, Bug, GitCommit, FileText,
  ClipboardList, Users, Layers, BookOpen, CreditCard, BarChart2,
  Video, MessageSquare, AlertTriangle, EyeOff, TrendingUp,
  ArrowRightLeft, Mail, Brain, MessageCircle,
}

interface ToolHeaderProps {
  config: ToolConfig
  categoryStyle: { color: string; bgColor: string; borderColor: string }
  onHistoryClick: () => void
  isRunning: boolean
}

export function ToolHeader({ config, categoryStyle, onHistoryClick, isRunning }: ToolHeaderProps) {
  const activeProvider    = useUIStore((s) => s.activeProvider)
  const setActiveProvider = useUIStore((s) => s.setActiveProvider)
  const activeProjectId   = useUIStore((s) => s.activeProjectId)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const Icon = ICON_MAP[config.icon] ?? Zap
  const providerInfo = AI_PROVIDERS[activeProvider as AIProvider]
  const { data: projects } = useProjects()

  const activeProject = projects?.find((p) => p.id === activeProjectId)

  return (
    <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.06)] bg-[#09090b]">
      <AnimateProgressBar active={isRunning} />

      <div className="flex items-center justify-between px-5 py-3">
        {/* Left: Tool info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: categoryStyle.bgColor, border: `1px solid ${categoryStyle.borderColor}` }}
          >
            <Icon size={15} style={{ color: categoryStyle.color }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-ink truncate">{config.name}</h1>
              {config.flagship && (
                <Badge variant="amber" className="text-[10px] py-0">Flagship</Badge>
              )}
            </div>
            <p className="text-xs text-ink-dim truncate hidden sm:block">{config.description}</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Project picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium',
                  'border transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]',
                  activeProject
                    ? 'border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.7)]'
                    : 'border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)]',
                )}
              >
                {activeProject ? (
                  <>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: activeProject.color }}
                    />
                    {activeProject.name}
                  </>
                ) : (
                  <>
                    <Folder size={11} />
                    No project
                  </>
                )}
                <ChevronDown size={10} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveProjectId(null)}>
                <span className="text-[rgba(255,255,255,0.5)]">No project</span>
              </DropdownMenuItem>
              {projects?.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className={activeProjectId === p.id ? 'text-amber' : ''}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* AI Provider pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium',
                  'border transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]',
                )}
                style={{
                  color: providerInfo.color,
                  borderColor: `${providerInfo.color}40`,
                  backgroundColor: `${providerInfo.color}10`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerInfo.color }} />
                {providerInfo.label}
                <ChevronDown size={11} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(AI_PROVIDERS).map(([key, info]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setActiveProvider(key as AIProvider)}
                  className={activeProvider === key ? 'text-amber' : ''}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                  {info.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* History */}
          <Tooltip content="View history">
            <Button variant="ghost" size="icon" onClick={onHistoryClick} className="h-7 w-7">
              <History size={14} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function AnimateProgressBar({ active }: { active: boolean }) {
  return (
    <div className="h-0.5 w-full overflow-hidden">
      <AnimatePresence>
        {active && (
          <motion.div
            key="progress"
            className="h-full w-full progress-bar"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Pass activeProjectId to tool run in ToolPage**

In `frontend/src/components/tools/ToolPage.tsx`, update the `handleRun` function.

Find this block:
```typescript
  const handleRun = useCallback(async (input: Record<string, unknown>) => {
    setOutput('')
    setUsageId(null)
    setRated(null)
    try {
      const result = await runTool.mutateAsync({ ...input, preferredProvider: activeProvider })
```

Replace it with:
```typescript
  const activeProjectId = useUIStore((s) => s.activeProjectId)

  const handleRun = useCallback(async (input: Record<string, unknown>) => {
    setOutput('')
    setUsageId(null)
    setRated(null)
    try {
      const result = await runTool.mutateAsync({
        ...input,
        preferredProvider: activeProvider,
        ...(activeProjectId ? { projectId: activeProjectId } : {}),
      })
```

> Note: Add `const activeProjectId = useUIStore((s) => s.activeProjectId)` after the existing `const activeProvider = useUIStore((s) => s.activeProvider)` line.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify in browser**

1. Go to any tool page (e.g., http://localhost:3000/tools/forge)
2. The tool header now shows a "No project" pill next to the AI provider picker
3. Click it → dropdown shows your projects
4. Select a project → pill updates to show project name with colour dot
5. Run the tool
6. Check Activity Feed → the run appears with the project tag

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/tools/ToolHeader.tsx frontend/src/components/tools/ToolPage.tsx
git commit -m "feat(tools): add project picker to tool header, pass projectId on every run"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Navigation: icon rail (52px) + sub-panel (220px) + content — Tasks 7, 8, 9
- [x] Project model with all fields — Task 1
- [x] Projects list page (3-col card grid) — Task 10
- [x] Projects detail page (stats + recent activity) — Task 10
- [x] projectId FK on ToolUsage — Task 1
- [x] projectId + sharedWithTeam on Prompt — Task 1
- [x] ToolSource enum (WEB/VSCODE/GMAIL/CHATBOT/FLOW) — Task 1
- [x] source captured from X-FluxDesk-Client header — Task 4
- [x] Activity Feed page with platform + project filters — Task 11
- [x] Paginated activity API — Task 3
- [x] /history redirects to /activity — Task 9
- [x] Project picker in tool header — Task 12
- [x] projectId sent on every tool run — Task 12
- [x] Active project context shown in SubPanel with selector — Task 8

### Not in Plan A (deferred to Plans B and C)
- Flows section (Plan B)
- Integrations section (Plan C)
- Team section (Plan C)
- Dashboard widget redesign (minor — do after shell is shipped)
