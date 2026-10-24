# RuFlo Hub — Multi-project starter

> **Status: safe skeleton, NOT a running RuFlo controller.** This repository centralizes reusable project manifests and policies. It does not start agents, fetch repositories, or access accounts. A separate GitHub Actions smoke test temporarily installs RuFlo in an isolated runner; no persistent runtime is enabled.

[راهنمای فارسی](docs/SETUP.fa.md) · [گزارش نصب آزمایشی](docs/RUFLO-LAB.fa.md)

## Purpose

Use one GitHub repo to version common orchestration patterns, policy templates and project *references*, while keeping each project's working directory, credentials, memory, CI and write/merge/deploy authority **isolated**.

```text
ruflo-hub (central configuration, templates, validation)
       |                |                  |
   Proffera         Customer sites      Future projects
 (its Supervisor)    (their policies)   (their policies)
```

RuFlo is an external open-source tool: https://github.com/ruvnet/ruflo . This hub is a separate starter repository; it is not a fork of RuFlo.

## What works now

- Versioned project profiles under `profiles/`.
- Strict offline, read-only policy validation. Write, push, merge, deploy, secrets and even live connections are rejected in the current schema.
- Existing static validation CI plus an isolated GitHub Actions installation smoke test for pinned `ruflo@3.56.10` (verified successful on 2026-10-17; [run](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39072082243)). The latter installs only in a disposable runner and calls no AI provider.
- A reusable template for onboarding another project.

## What does NOT work yet

- No *persistent* RuFlo runtime or integration with Claude Code, Codex or GitHub APIs. A temporary Ruflo CLI smoke test exists, but it does not connect projects.
- No agent scheduling, automatic code edits, shared runtime memory, dashboards or billing integration.
- JSON policy validation is *not* an access control around third-party tools. Actual enforcement must be separately implemented and security-reviewed before connecting anything.

## Local commands (Node.js 22+)

```bash
npm run validate
npm run projects
npm test
```

No `npm install` required; the starter has zero runtime dependencies.

## Adding a project

1. Copy `templates/project.example.json` to `profiles/<project-id>.json`.
2. Set `id`, `repository`, `namespace` (`project:<id>`) and the correct governing authority.
3. Keep `connected: false` and `mode: read_only`.
4. Run `npm run validate && npm test`.
5. Add an isolated RuFlo runtime later only after an explicit integration and security review.

**Proffera:** `profiles/proffera.json` is only a reference entry. Its existing Supervisor, authorization gates, exact-head evidence, human merge authority and production restrictions are not replaced or modified.

## Public repository safety

This repository is public by owner choice. Do not put secrets, unpublished customer code, tokens, project memory, or private operational details here. A GitHub private repository also exists on the free plan; visibility may be changed later.

## Next phases (not implemented)

1. Review upstream RuFlo releases, dependencies and security advisories; pin an approved version.
2. Pilot a separate local RuFlo client/workspace in read-only mode on an unimportant test repository.
3. Evaluate usefulness, compatibility with Codex, failure handling, cost and isolation.
4. Only then consider dedicated integration adapters and explicit per-project authorization.

For architecture and security boundaries see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run from GitHub (manual control)

The [RuFlo Hub control](https://github.com/ibboabdoli-ai/ruflo-hub/actions/workflows/ruflo-control.yml) workflow provides two explicit choices:

- **status**: inspect public, disconnected project profiles and current read-only policy; no Ruflo binary or external repository is executed.
- **installation-smoke** (hub only): install pinned RuFlo 3.56.10 and test `ruflo init` in a disposable GitHub-hosted VM. The runner is discarded when the job finishes.

To use it: open **Actions → RuFlo Hub control (manual) → Run workflow**, select `status` / `installation-smoke`, and check the run summary. No API secrets, per-project access or production rights are configured. **This is NOT a 24/7 agent server.**

## Read-only project pilot: Ibbo Receipt AI

[Run the isolated Receipt AI pilot](https://github.com/ibboabdoli-ai/ruflo-hub/actions/workflows/ruflo-receipt-pilot.yml) to test the pinned RuFlo CLI security scanner and run this public repository's unit tests, type checking and lint on a pinned commit without AI provider keys. This does **not** mean live multi-agent LLM review is enabled. See [pilot scope](docs/RECEIPT-PILOT.fa.md).

## Read-only فارسی dashboard

The static [Persian observer dashboard](docs/index.html) displays public GitHub PR/check metadata only. It never starts RuFlo agents or connects to the Proffera Supervisor. See [usage and GitHub Pages opt-in instructions](docs/DASHBOARD.fa.md). GitHub Pages publishing is disabled until the repository owner enables it in Settings → Pages.
