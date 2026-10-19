# Paid pilots are disabled pending owner security approval

**Current state (2026-10-19):** Draft PR #1 only. Both previously paid GitHub Actions
entrypoints were replaced with **credential-free offline regression and MCP smoke**.
They do not read `secrets.OPENAI_API_KEY` or start model inference. The former live
Codex CLI harness was removed because a process timeout is **not** a hard
request/token/billing budget. Historical successful runs remain linked in docs.

## Why a commit marker is insufficient

A person or bot that can push to the test branch can change both the workflow and
script in the same commit. Requiring a marker in the commit message is not owner
approval and does not prevent a changed script from exposing a repository-level
API key. An Actions token with `contents: read` does not protect secrets from code
executing in a step that holds them.

## Required owner-admin setup BEFORE proposing any future paid test

1. **Remove or rotate the existing repository-level `OPENAI_API_KEY` secret** in
   GitHub Actions settings. The connector used for this PR cannot view, move,
   delete or rotate GitHub secrets, so completion of this step is **not verified**.
   Until then, repo collaborators/workflows with secret access remain a residual
   risk even though the current PR workflows do not reference the key.
2. Create a GitHub **protected Environment** for narrowly scoped paid experiments,
   with required reviewer approval and no self-approval, a restricted deployment
   branch policy, and the provider key stored **only** as that Environment's
   secret. Verify the protection settings with owner/admin access before wiring
   a new job to it. Environment name alone does not confer protection.
3. Establish an **independent, provider-enforced consumption limit** suitable for
   the pilot, verified not to be merely an alert, or use an externally enforced
   proxy that rejects further requests once a strict count/token budget is reached.
   Codex CLI timeouts and after-the-fact usage reports are insufficient.
4. Review the exact approved source SHA, Actions code, dependency pins and
   expected bounded test prompts. Require a separate owner authorization for
   any paid run; do not accept a commit marker or a GitHub user comment alone.
5. Add a new audited workflow only after steps 1-4 are independently verified;
   rerun tests and security review. No real Proffera source, GitHub write/merge
   token, production secret or customer data is allowed in this fixture pilot.

## Free proof available now

- `npm run validate` and `npm test`
- `ruflo-readonly-facade.yml`: real local RuFlo MCP read-only handshake smoke
- `ruflo-codex-live-mcp.yml`: zero-key read-only facade preflight
- `ruflo-tracked-openai-relay.yml`: offline bounded-provider regression only
- `node scripts/ruflo-codex-receipt-audit.mjs <local-jsonl>`: an **offline**
  parser that proves an actual MCP return value matches Codex's final count.
  It rejects duplicates, fabricated results, missing evidence and failed turns.

**Not authorized:** enabling the prior paid workflows, merging Draft PR #1,
connecting Proffera, enabling autonomous agents or deploying any service.
