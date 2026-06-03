# ADR-001: Agent Roster Design

## Status
Accepted

## Context
FluxDesk has three dominant development workflows: (1) adding/modifying AI tools,
(2) pipeline/engine work, and (3) service hardening (tests, security, rate limiting).
We need an agent system that maps to these workflows without creating unnecessary
agent boundary crossings or orphaned responsibilities.

## Options Considered

### Option A: Domain-split (5 agents)
Planner, Frontend, Backend, Test, Reviewer.
Boundary: frontend = React/Next.js pages/components; backend = lib/server + API routes.

### Option B: Layer-split (6 agents)
Planner, UI, API-routes, Services, Test, Reviewer.
Boundary: split the backend into "API route handlers" and "service layer".

### Option C: Workflow-split (4 agents)
Planner, Tool-engineer (tools + UI), Pipeline-engineer (engine + routes), Reviewer.
No dedicated test agent.

## Decision

Option A (domain-split, 5 agents).

Reasons:
- Option B's API/Service split creates constant boundary fights — adding a new tool
  always touches `toolDefinitions.ts` (service) AND `src/app/api/tools/[toolId]/run`
  (API route) simultaneously. One agent should own both.
- Option C's workflow-split orphans cross-cutting concerns: rate limiting and auth
  are used by all tool and pipeline routes — a "tool-engineer" and "pipeline-engineer"
  would both need to touch them.
- A dedicated Test agent is essential: TDD discipline requires someone whose only job
  is writing RED tests first. If tests are a side responsibility of backend/frontend,
  they get skipped under pressure.

## Consequences

**Positive:**
- Clean ownership — no file is owned by two agents
- Test agent enforces RED→GREEN discipline as a first-class citizen
- Reviewer is purely a gate — no implementation responsibility removes bias

**Negative / risks:**
- Adding a new tool still requires two agents (backend for schema, frontend for UI page)
  — the orchestrator must coordinate them; they cannot be fully autonomous
- Backend agent owns a large surface area; may need further splitting if the codebase
  grows significantly

**Action items:**
- Write agent files to `.claude/agents/`
- Update CLAUDE.md to reference the roster
- Revisit if backend consistently takes > 3x the time of frontend per task
