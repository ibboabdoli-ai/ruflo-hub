# Official RuFlo 3.72.2 — isolated release checkpoint (2026-11-06)

**Decision: BLOCKED / NOT APPROVED FOR PROFFERA.** No integration, Supervisor access,
production workflow, merge to main, real customer data, paid model APIs or real
AI coding was attempted.

## Verified primary evidence

- [Official RuFlo v3.72.2](https://github.com/ruvnet/ruflo/releases/tag/v3.72.2),
  published **2026-11-06 14:13 UTC**. Upstream reports an attention native
  dependency fix (moves to `ruvector ^0.3.13`, `@ruvector/attention ^2.2.3`)
  and `@claude-flow/neural 3.0.3` with `sona 0.1.11`; explicitly notes that
  the Zod 4 security migration is **not fixed** in this release.
- [v3.72.0](https://github.com/ruvnet/ruflo/releases/tag/v3.72.0)
  changes MCP stdio negotiation and security checks. Its Tasks extension
  is still planned work; none of those claims constitutes Proffera integration.
- **Actual installed official npm package** in
  [GitHub Actions #42279126487](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/42279126487):
  npm package versions were independently queried from npm registry;
  `ruflo 3.72.2`, standalone `@claude-flow/cli-core 3.7.5`,
  `@claude-flow/shared 3.0.7`, `@claude-flow/security 3.0.6`.
  The release installed `@claude-flow/cli 3.72.2` and `zod 3.25.76`.
- **76/76 repository tests PASS**; these are Hub tests, not the full upstream
  RuFlo suite. `npm ci` with a temporary lock succeeded in an ephemeral
  GitHub runner, no scripts, no optional dependencies, no model provider keys.
- **Fail-closed security gate FAIL** because CLI/shared/security declare only
  Zod 3 (`^3.22.0`, `^3.22.4`, `^3.22.0`). Zod 4 negative-input runtime
  tests **were not run**, so neither compatibility nor repaired security
  validation can be claimed.
- **npm audit**, installed prod/non-optional dependency tree:
  **7 HIGH / 3 MODERATE / 0 CRITICAL**, unchanged from the verified
  3.71.4 test on 2026-11-05. Audit scope excludes optional and dev packages.
  Native attention Rust panic/DoS paths were **not exercised** in this lab.
- [Upstream PR #4535](https://github.com/ruvnet/ruflo/pull/4535):
  unmerged with six failed and seven successful PR-triggered workflow runs
  at its unchanged head.
  [Upstream PR #4551](https://github.com/ruvnet/ruflo/pull/4551):
  still Draft/unmerged; six successful, one failed workflow at its head.
  No CI gate bypass.
- Hub [PR #10](https://github.com/ibboabdoli-ai/ruflo-hub/pull/10)
  and [PR #12](https://github.com/ibboabdoli-ai/ruflo-hub/pull/12)
  remain Draft/unmerged. The 3 native MCP task records from PR #12 validate
  *task bookkeeping only*, not autonomous code generation or speed advantage.

## Decision and next gate

**Do not merge this research branch or grant production access.**
The prior lab script, CI and source remain isolated, with read-only GitHub
permissions and no real Proffera operations.
Await an officially published, supported Zod 4 migration. Then independently
run installed-package negative-input validation, npm audit, full upstream CI,
MCP task semantics and restricted source-only trials against synthetic data.

Comparison with 2026-11-05: **new features and upstream-claimed attention
dependency repair, but no decrease in our 7 HIGH alerts or release-readiness
blockers.** The published release is not sufficient proof of production safety.
