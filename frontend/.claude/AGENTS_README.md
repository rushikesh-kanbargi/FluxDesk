# How to Use the FluxDesk Agent System

## Starting an Agentic Task

### 1. Kick off the orchestrator

```
/orchestrate feature "Add a new tool called Meeting Summarizer that takes a transcript and returns structured action items"
```

The orchestrator will:
1. Run the **Planner** — produces `tasks/todo.md` with decomposed units
2. **PAUSE** and show you the plan — you approve or modify before implementation starts
3. Dispatch **Backend** + **Frontend** + **Test (RED)** in parallel
4. After all three complete, run **Test (GREEN)** verification
5. Run the **Reviewer** — shows SHIP / NEEDS WORK / BLOCKED
6. Emit the final orchestration report

### 2. Review and approve the plan

The orchestrator always pauses after the Planner step for your review.
You'll see something like:

```
PLAN READY — Awaiting approval

Tasks:
[backend] Add MeetingSummarizer schema + system prompt to toolDefinitions.ts
[backend] Add buildUserMessage case in toolHelpers.ts
[test]    Write RED tests for schema and buildUserMessage
[frontend] Add /tools/meeting-summarizer page

Parallel in Phase B: backend + frontend + test-RED
Sequential: test-GREEN → reviewer

⚠️ Human approval points: none for this task

Type "proceed" to start, or modify the plan first.
```

### 3. Review the output

After all agents complete, you'll get the Orchestration Report with:
- What each agent changed
- Test results (pass count + coverage delta)
- Reviewer verdict with any findings

### 4. Merge

Only merge after:
- Reviewer returns **SHIP**
- You've read the findings and accepted any outstanding warnings
- `npm test` is green in your local environment

---

## Workflow Reference

| Command | Use When |
|---|---|
| `/orchestrate feature "..."` | Adding a new tool, page, or capability |
| `/orchestrate bugfix "..."` | Investigating and fixing a specific defect |
| `/orchestrate harden "..."` | Improving test coverage or security posture |
| `/orchestrate review "..."` | Gate check before merging a branch |

---

## Working With Individual Agents

You can also invoke agents directly without the orchestrator for focused work:

```
# Ask the backend agent to implement a specific function
Use backend agent: implement checkDemoEligibility edge case for ip_limit

# Ask the test agent to write coverage for a specific file
Use test agent: write tests for src/lib/server/memoryService.ts

# Ask the reviewer to audit a specific file
Use reviewer agent: audit src/app/api/keys/route.ts
```

---

## When Agents Hit a Human Checkpoint

The orchestrator will STOP and present a checkpoint like:

```
⛔ HUMAN APPROVAL REQUIRED

The backend agent wants to run: prisma migrate dev
Reason: New UserFeedback table added to schema.prisma

Migration file preview:
-- CreateTable
CREATE TABLE "UserFeedback" (...)

Type "approve migration" to proceed, or "skip" to defer.
```

Do not type "proceed" without reviewing the migration. Migrations are irreversible
in production without a rollback migration.

---

## Evals

Run the full eval suite at any time:

```bash
npm test && npm run type-check && npm run lint && npm run test:coverage
```

See `.claude/evals/README.md` for the 9 individual eval tasks (E-001–E-009)
and the regression baseline.

---

## Agent Files

| File | Purpose |
|---|---|
| `.claude/agents/planner.md` | Planner agent persona |
| `.claude/agents/frontend.md` | Frontend agent persona |
| `.claude/agents/backend.md` | Backend agent persona |
| `.claude/agents/test.md` | Test agent persona |
| `.claude/agents/reviewer.md` | Reviewer agent persona |
| `.claude/orchestrator.md` | Orchestration protocol |
| `.claude/guardrails.md` | Non-negotiable safety rules |
| `.claude/evals/README.md` | Eval task set + regression baseline |
| `.claude/adr/` | Architecture Decision Records |
