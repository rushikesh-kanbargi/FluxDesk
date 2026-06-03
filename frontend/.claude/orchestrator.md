# FluxDesk Orchestrator

The orchestrator decomposes a task, dispatches agents in the right order (with
parallelism where safe), collects results, and produces a final report.

---

## How to Invoke

```
/orchestrate feature  "Add a new tool called X that does Y"
/orchestrate bugfix   "Pipeline step N output not chaining to step N+1"
/orchestrate harden   "Increase test coverage for aiService and pipelineEngine"
/orchestrate review   "Review all changes before merging branch X"
```

Human approval is required before the orchestrator proceeds past the planning
step for tasks that touch: `prisma/schema.prisma`, `auth.ts`, `encryption.ts`,
or any deploy/migration step.

---

## Workflow Definitions

### feature — Add a new capability

```
Phase A (plan):
  planner → writes tasks/todo.md, emits handoffs

Phase B (implement, parallel where independent):
  backend  ──┐
  frontend ──┤ → all three run in parallel when work is separable
  test     ──┘   (test writes RED tests; backend/frontend implement to GREEN)

Phase C (gate):
  reviewer → SHIP | NEEDS WORK | BLOCKED
```

Parallelism rule: backend + frontend + test-RED run in parallel.
After backend/frontend are GREEN, test-GREEN + reviewer run sequentially.

### bugfix — Fix a specific defect

```
planner → backend (root cause + fix) → test (regression) → reviewer
```

No parallelism — each step depends on the previous.

### harden — Improve test coverage or security posture

```
planner → test (RED) → backend (implement to GREEN) → reviewer
```

### review — Gate check before merge

```
reviewer (standalone, no implementation)
```

---

## Parallelism Rules

**Can always run in parallel:**
- `frontend` and `backend` when they own completely separate files
- `test` (RED phase) and `backend`/`frontend` when the test file is new (no production code needed to write it)

**Must be sequential:**
- `test` GREEN phase after `backend`/`frontend` complete
- `reviewer` always last
- Any step after a human approval checkpoint

---

## Orchestrator Execution Protocol

1. **Receive task description**
2. **Invoke Planner** — read its `tasks/todo.md` output
3. **Check for human approval checkpoints** — if any, STOP and present to human
4. **Dispatch implementation agents** (parallel where the plan allows)
5. **Collect handoffs** from each agent
6. **Verify** — run `npm test` + `npm run type-check` before invoking reviewer
7. **Invoke Reviewer** — collect SHIP/NEEDS WORK/BLOCKED verdict
8. **If NEEDS WORK** — re-dispatch the flagged agents with the reviewer's findings
9. **If SHIP** — emit final orchestration report

Maximum 2 re-dispatch cycles. If still NEEDS WORK after 2 cycles, escalate to human.

---

## Final Orchestration Report

```markdown
# Orchestration Report

**Task:** [description]
**Workflow:** [feature | bugfix | harden | review]
**Verdict:** SHIP | NEEDS WORK | BLOCKED | ESCALATED

## Agent Summary
- Planner: [plan summary]
- Backend: [what changed]
- Frontend: [what changed]
- Test: [RED → GREEN, coverage delta]
- Reviewer: [verdict + top findings]

## Files Changed
[list]

## Test Results
npm test: PASS (N tests)
Coverage: lines X% / functions Y% / branches Z%

## Reviewer Findings
### Blocking (resolved)
### Warnings (outstanding)

## Human Approval Points
[any checkpoints that were presented to human and approved/skipped]

## Next Steps
[what remains if NEEDS WORK or ESCALATED]
```

---

## Stop Conditions (explicit)

The orchestrator stops and waits for human input when:

1. Planner flags a schema migration, auth change, or encryption change
2. Reviewer returns BLOCKED (tests fail)
3. Re-dispatch cycle limit (2) is reached
4. Any agent reports it cannot complete its unit without ambiguous requirements

The orchestrator never runs destructive operations (git reset, drop table,
force push) without explicit human instruction in that session.
