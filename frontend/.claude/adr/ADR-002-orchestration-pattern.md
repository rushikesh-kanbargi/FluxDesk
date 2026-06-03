# ADR-002: Orchestration Pattern

## Status
Accepted

## Context
We need an orchestration pattern that: decomposes tasks, dispatches agents in
parallel where safe, enforces human approval at risky checkpoints, and has
explicit stop conditions. The pattern must work within Claude Code's session
model (no persistent background processes).

## Options Considered

### Option A: In-session sequential orchestration
Planner runs → outputs handoff → next agent runs → etc. All within one Claude
Code session. Simple, no external infrastructure.

### Option B: Worktree-based parallel execution
Each agent gets an isolated git worktree. Agents run truly in parallel via
Claude Code's Agent tool spawning. Orchestrator merges results.

### Option C: External queue (BullMQ / Redis)
A Node.js orchestrator process manages agent tasks via a queue. Persistent
across sessions.

## Decision

Option B with Option A fallback.

Primary: Use Claude Code's `Agent` tool with `isolation: "worktree"` for
parallel phases (backend + frontend + test-RED). This gives true parallelism
with isolated file systems and automatic cleanup if nothing changes.

Fallback: For sequential-only workflows (bugfix, harden) use in-session
sequential dispatch — simpler, no worktree overhead.

Option C is deferred: external queue adds operational complexity (Redis, a
Node process) that isn't justified until agent tasks reliably exceed 10 minutes
of wall-clock time.

## Consequences

**Positive:**
- Parallel phases genuinely reduce wall-clock time for feature additions
- Worktree isolation prevents agents from seeing each other's partial work
- No external infrastructure required

**Negative / risks:**
- Worktree merges can produce conflicts if agents touch shared files
  (mitigation: orchestrator assigns non-overlapping files per agent)
- Session context is not shared between worktree agents — each agent must
  re-read relevant context from the codebase

**Action items:**
- Parallelism rule: backend + frontend only run in parallel when their
  assigned files are completely non-overlapping (verified by the planner)
- Orchestrator checks for conflicts before merging worktree output
- Document stop conditions: max 2 re-dispatch cycles, human escalation after
