# FluxDesk — Claude Code Instructions

## What This Is

FluxDesk is an AI-powered prompt engineering and workflow automation platform.
21 purpose-built tools, multi-step pipelines, user memory profiling, multi-provider
AI support (Claude, OpenAI, Gemini, Groq).

---

## Agent System

This project uses a 5-agent system. Always route work through the right agent.

| Agent | File | Owns |
|---|---|---|
| Planner | `.claude/agents/planner.md` | Task decomposition, `tasks/todo.md` |
| Frontend | `.claude/agents/frontend.md` | `src/app/(app|auth)/**`, `src/components/**`, `src/stores/**` |
| Backend | `.claude/agents/backend.md` | `src/lib/server/**`, `src/app/api/**`, `prisma/` |
| Test | `.claude/agents/test.md` | `src/tests/**`, `vitest.config.ts` |
| Reviewer | `.claude/agents/reviewer.md` | Cross-cutting gate — read-only |

### Invoking the Orchestrator

```
/orchestrate feature  "Add a new tool called X"
/orchestrate bugfix   "Pipeline step chaining broken"
/orchestrate harden   "Add coverage for aiService"
/orchestrate review   "Gate check before merge"
```

See `.claude/orchestrator.md` for the full orchestration protocol.

### Guardrails

All agents follow `.claude/guardrails.md`. Key rules:
- Human approval required before: schema migrations, auth changes, encryption changes, merges, deploys
- Reviewer must return SHIP before any merge
- Max 2 re-dispatch cycles before escalating to human
- No agent auto-merges or auto-deploys

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 App Router, React 19 |
| Client state | Zustand 5, TanStack Query 5 |
| UI | shadcn/ui, Radix, Tailwind, Framer Motion |
| Server | `src/lib/server/` — aiService, pipelineEngine, memoryService, auth, rateLimit, encryption |
| Database | PostgreSQL via Prisma 5 |
| AI Providers | Anthropic, OpenAI, Google Gemini, Groq |
| Tests | Vitest v4, v8 coverage |
| Rate limiting | In-memory fallback; Upstash when `UPSTASH_REDIS_REST_URL` is set |

---

## Commands

```bash
npm run dev          # Start dev server
npm test             # Run unit tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report (must exit 0)
npm run type-check   # TypeScript check
npm run lint         # ESLint
npm run build        # Production build
```

---

## Key Contracts (don't break these)

- `checkRateLimit` is **async** — always `await` it
- `withAuth`/`withAuthStream`/`withAdmin` wrap every protected route
- `createPipelineSchema` enforces `steps.max(10)`
- `stepOutputsSchema` enforces max 20 keys, 10k chars per value
- `claimDemoRun` uses atomic `updateMany` with `WHERE demoRunsUsed < DEMO_RUNS_MAX`
- All new tools in `toolDefinitions.ts` need: `id` (kebab), `schema` (Zod), `buildSystem(personalisation)`

---

## Evals

See `.claude/evals/README.md` — 9 fixed tasks (E-001 through E-009).
All must pass before a workflow is marked done.

---

## Lessons Learned

See `tasks/lessons.md` for rules learned from past corrections.

---

## Session Discipline

- 70% context: wrap up and emit handoff
- 85%: /compact
- 90%+: /clear before next task
