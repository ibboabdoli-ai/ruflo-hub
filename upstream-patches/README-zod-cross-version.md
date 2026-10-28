# Upstream RuFlo patch proposal: Zod 3 / 4 validation interoperability

Target: `ruvnet/ruflo` main (source checked against tag `v3.63.6`, whose relevant files matched main at time of preparation).

Suggested PR title: **fix(shared,security): make validators compatible with Zod 3 and 4**

## Why

The RuFlo v3.63.6 published `@claude-flow/shared` config validator calls `ZodError.errors.map()` and the security validator calls removed `z.string().ip()` APIs. With a forced Zod v4 dependency, invalid config input throws a `TypeError` and importing the security module fails outright. Zod 3 remains the declared dependency for these packages; this patch adds dual-version compatibility to the affected source paths without changing package dependency declarations or production defaults.

## Changes

- Use `ZodError.issues` (available in both major versions) for structured validation failures.
- Replace brittle Zod type parameters with structural `parse`/ `safeParse` contracts.
- Update `z.record` schema declarations for Zod 4's explicit key schema (also valid in Zod 3).
- Convert security error-map handling to support Zod 3 and Zod 4 issue codes/shapes, preserving meaningful default error messages.
- Validate IPv4/IPv6 with Node's `isIP` via Zod's `refine` instead of removed `.ip()`.
- Add independent regression tests for negative config input, IP family restrictions, malformed emails, unsafe commands, and traversal paths.

## Tested

- **GitHub Actions: [run #40647231788](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/40647231788)**.
- `git apply --check` and `git apply` against the upstream **v3.63.6** sparse checkout: **PASS**.
- `vitest` selected upstream validation tests against **Zod 3.25.76**: **62/62 PASS**.
- Same tests against **Zod 4.6.7**: **62/62 PASS**.
- TypeScript 5.9.3 `tsc --noEmit` of changed validator modules: **PASS** for both Zod versions.
- No model inference, no provider keys, no private repositories, no production services. No merge has been performed.

## Boundaries / reviewer notes

- This is **not a complete Zod 4 migration** and must not widen dependencies to Zod 4 automatically. Additional packages/functions may still rely on Zod 3 APIs; a full upgrade needs upstream-wide tests, builds, and security review.
- `node:net`'s `isIP` is used for validation; maintainers should verify browser-bundle compatibility if `@claude-flow/security` is imported into browser runtimes.
- Complete full upstream CI before merging. The Hub's experimental Zod v4 override in **PR #10** remains blocked separately and is not part of this upstream patch.

## How to submit

1. Fork `ruvnet/ruflo` to `ibboabdoli-ai/ruflo` on GitHub.
2. Create branch `fix/zod3-zod4-validation-compat` from **upstream main**.
3. Apply [the reviewed patch](./ruflo-zod-cross-version-v3.63.6.patch) with `git apply --check` and `git apply`.
4. Run Zod 3/4 validation tests and the upstream full suite, commit, and open a PR to `ruvnet/ruflo:main`.
5. Request independent maintainer review; do not auto-merge.

Tracked local issue: [ruflo-hub #11](https://github.com/ibboabdoli-ai/ruflo-hub/issues/11).
