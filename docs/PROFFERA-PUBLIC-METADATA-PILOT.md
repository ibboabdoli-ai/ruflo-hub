# Credential-free Proffera PR metadata probe

A proposed public-metadata-only pilot, not a live RuFlo agent and not a Proffera Supervisor integration.

Run with Node.js 22+ and an explicitly approved full PR head SHA:

    node scripts/inspect-public-proffera-pr.mjs 9ac8b38df37cdcb8a917ea4c10f2cc9f79a750ca

This script accepts no repository URL or credentials. It sends two unauthenticated GET requests to public GitHub REST endpoints for Proffera PR #941 and the exact commit's check-run metadata with `filter=all`, covering historical/re-run check executions rather than GitHub's default latest-only view. There are no retries; each request has an 8-second timeout. Missing, stale, truncated, over-100-check or cross-head data stops with NOT VERIFIED. A process-level regression test mocks success of the first request followed by a 403 on the second and verifies the CLI emits only fixed sanitized text.

The CLI prints fixed, non-network-derived status text to prevent log injection. The exported function returns a bounded numeric observation to its caller, but prints no data from remote responses. No source files, patches, PR comments, tokens, customer data, production resources, RuFlo workers, code writes, merge actions or deployments are accessed. Counts do not establish merge readiness.

Offline tests:

    node --test tests/inspect-public-proffera-pr.test.mjs

The script is staged independently of Draft PR #1. It is not a live integration, and must not change profiles/proffera.json (connected remains false). See issue #2 for owner-only protection and future paid-experiment requirements.