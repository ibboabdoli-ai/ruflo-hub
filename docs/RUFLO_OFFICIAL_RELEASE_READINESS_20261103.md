# RuFlo official release readiness — 2026-11-03

## Decision

**NOT READY for Proffera or Supervisor.** This is an isolated zero-key
candidate check, not a production integration, and not a Codex-vs-RuFlo
benchmark.

- Official candidate: `ruflo@3.71.0`.
- [Verified GitHub Actions run #41707848359](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/41707848359)
  ran 76/76 repository tests successfully; installed the actual published
  `ruflo@3.71.0` and `@claude-flow/cli@3.71.0` in a temporary hosted runner.
- Installed `zod@3.25.76`. The CLI, shared and security packages still
  declare Zod 3, not Zod 4.6.6+ supported by this safety gate.
- npm audit on the installed, non-optional dependency tree reported
  **7 high, 0 critical, 3 moderate** advisories. This excludes optional
  dependencies and is not a comprehensive security assessment.
- The runtime Zod 4 negative-input check was **NOT RUN** because the supported
  Zod 4 baseline was missing; the gate failed closed.
- Workflow failed on the expected release blockers. No production access,
  no Proffera source/data checkout, no customer reservations, no keys,
  no paid model calls, no GitHub write token, no push/merge.

## Why RuFlo might still be useful

The [synthetic booking lab (Draft PR #12)](https://github.com/ibboabdoli-ai/ruflo-hub/pull/12)
demonstrated real RuFlo MCP task bookkeeping: researcher, coder and tester task
records were created and completed, and a pre-written static booking fixture
passed 12/12 deterministic assertions. It **did not** invoke autonomous
agents, edit Proffera, or establish faster development than Codex. Because
Proffera already has a Supervisor, any RuFlo addition must demonstrate
measurable benefits in isolated, reviewed trials without overlapping writes.

## Required before considering real integration

1. Upstream resolves [Zod v4 migration #4535](https://github.com/ruvnet/ruflo/pull/4535)
   and releases compatible CLI/shared/security packages.
2. Refresh a fully reviewed, pinned integrity lock and repeat both dependency
   audit and negative-input runtime checks on the actual published packages.
3. Reproduce a read-only, single-purpose test on a restricted *source-only*
   Proffera checkout without credentials or background workers.
4. Independently benchmark actual work against Codex/Supervisor; use explicit
   cost and write controls. Do **not** connect to production as part of
   this research PR.

[Workflow](../.github/workflows/ruflo-official-release-readiness.yml) /
[validator script](../scripts/ruflo-release-readiness.mjs)

This deliberately blocked branch should stay unmerged until a genuine supported
release is available and separately reviewed.
