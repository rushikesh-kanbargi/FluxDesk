# FluxDesk Agent Guardrails

Rules that ALL agents must follow. These override any skill default.

---

## Scope Limits

Each agent is confined to its declared file ownership (see agent definitions).
An agent that touches files outside its scope must stop, note the boundary
violation in its handoff, and ask the orchestrator to re-assign the work.

## Destructive Operation Approval

The following operations require explicit human approval in the current session
before proceeding. An agent must STOP, state what it wants to do and why, and
wait for "yes, proceed" before continuing:

- `prisma migrate dev` or `prisma db push` (schema change)
- `git push --force` (any force push)
- `git reset --hard` (discards uncommitted work)
- `rm -rf` on any directory
- Deleting any migration file
- Changing `ENCRYPTION_KEY` handling in `encryption.ts`
- Adding a new OAuth provider or changing `auth.ts` JWT logic

## Secret and PII Rules

- Never read `.env`, `.env.local`, or `.env.production` and log or display their contents
- Never include real API keys in test fixtures — use the pattern `'0'.repeat(64)` for ENCRYPTION_KEY, `'sk-test-...'` for provider keys
- Never commit files matching `.env*` (gitignore enforces this — do not bypass)
- If a test requires a real Upstash URL, skip it with `it.skipIf(!process.env.UPSTASH_REDIS_REST_URL)`

## Human Checkpoint Before Merge/Deploy

The reviewer agent must return SHIP before any merge or deploy.
No agent auto-merges or auto-deploys — those actions require a human.

## Context Budget

- At 70% context: wrap up current agent task and emit handoff
- At 85%: /compact, then resume
- After any response > 40k tokens: check usage before continuing

## No Open-Ended Loops

All agent loops have a maximum iteration count:
- Orchestrator re-dispatch: max 2 cycles
- Any autonomous retry loop: max 3 attempts
- Test fix loop: max 3 attempts before escalating to human

## Verification Before Done

An agent unit is NOT done until:
1. `npm test` passes
2. `npm run type-check` passes
3. The reviewer has issued SHIP (for changes going to main)

"Works on my machine" is not a done condition.
