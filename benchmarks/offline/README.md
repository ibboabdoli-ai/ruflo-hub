# Offline RuFlo task bookkeeping benchmark — zero-cost lab

## Goal and honesty boundary

This isolated test measures the **extra bookkeeping overhead and successful
completion of three real RuFlo MCP tasks** in a disposable GitHub runner. It
does **not** benchmark the coding speed or accuracy of Codex, autonomous RuFlo
agents, or language models. Any claimed Codex-vs-RuFlo improvement is **NOT VERIFIED**.

## The fixed experiment

The synthetic problem has two intentionally broken functions:
- `average([])` incorrectly yields `NaN` rather than `null`, and fails
  to reject invalid numeric inputs.
- `canonicalIds` fails to trim/lowercase/deduplicate IDs and remove blanks.

Seven immutable requirements/tests are held in `cases.mjs`. At least three
must fail on the initial `defective.mjs` fixture, while the independent,
reviewed `reference.mjs` must pass all seven.

Both arms copy the **same existing solution** into a **temporary** candidate:
1. `direct` runs a single local reference-copy-and-test stage.
2. `ruflo` launches **real** pinned RuFlo v3.63.3 in an isolated local
   workspace, initializes its MCP server, registers three roles (Researcher,
   Coder, Tester), creates/assigns/completes three native tasks, rereads each
   persisted completion, and runs that **identical reference** test stage.

Three tasks represent bookkeeping stages; **no agent executes a model, creates
a patch, makes a Codex call, or autonomously hands off work**. The test harness
drives the order. The RuFlo arm includes MCP startup/coordination cost, while
the direct arm does not; timings are diagnostic and are **not an apples-to-apples
measure of model coding productivity**. Tiny process measurements are noisy,
not evidence of speedup or slowdown in production. The workflow installs
RuFlo in the disposable runner; the output timer excludes npm installation
time, so this is **not end-to-end setup cost**. Provider usage: 0.

## Safety

This is public synthetic code **only**, no source checkout from Proffera,
no Supervisor data or private operations, no GitHub write token, no cloud
database, no model API key or paid inference. The benchmark child process gets
a restricted environment with provider credentials explicitly empty.
Source tree remains unchanged; only a disposable scratch folder is modified
and then deleted. The GitHub Actions job has only `contents:read`, is
restricted to a fixed lab branch. All npm dependencies used by this
benchmark are pinned by `benchmarks/offline/deps/package-lock.json`, whose full
SHA-256 is checked before the read-only runner executes `npm ci --omit=optional --ignore-scripts`.
The root `@metaharness/router@0.4.0` pin resolves a peer-dependency
constraint of the RuFlo CLI; optional `ruvector` installs its own
`@metaharness/router@0.3.2` separately. The lockfile provides repeatability,
**not** a third-party security audit or proof the dependencies are risk-free.

## Acceptance evidence

A passing run must demonstrate:
- Defective input >=3 failing checks; repaired identical oracle 7/7.
- Both arms complete with 0 provider calls and 0 source repository edits.
- The RuFlo arm completes and reloads exactly three native task records.
- No writes to the source repository, secrets or production access.
- Store plain structured timing in workflow logs/summary; do not invent
  speedup percentages.

Workflow (branch-limited):
`https://github.com/ibboabdoli-ai/ruflo-hub/actions/workflows/ruflo-offline-benchmark.yml`

This test is **phase 1**. A genuine Codex-only vs Codex+RuFlo comparison would
require two independent, equally budgeted model trials on held-out tasks,
blinded scoring, provider-level hard spend limit, an owner-reviewed key
environment and **separate explicit authorization**. Never substitute this
free test for that evidence.

## Verified hosted runs (2026-10-25 and 2026-10-26)

- [Run 1](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/40215336462): 80/80 repository tests pass; direct fixture 4.348 ms; RuFlo MCP bookkeeping 395.822 ms.
- [Run 2](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/40413728346): 80/80 repository tests pass; direct fixture 3.775 ms; RuFlo MCP bookkeeping 398.51 ms.
- Both runs: 5 defective checks, 7/7 after the same pre-reviewed static patch; 3/3 persisted RuFlo tasks completed; 0 provider calls and 0 source repository edits.
- These timings exclude installation, measure unequal paths and cannot establish AI coding productivity or a Codex-vs-RuFlo speed ratio.

## Partial security remediation (2026-10-27)

The initial pinned 3.56.10 benchmark installed optional ML dependencies and
`npm audit --omit=dev` reported **1 critical, 16 high and 22 moderate**
advisories across 39 dependency entries. The critical `protobufjs@6.11.6`
path was `@xenova/transformers -> onnxruntime-web -> onnx-proto -> protobufjs`.
The lockfile marks this optional chain as `optional: true`. Our synthetic
MCP task bookkeeping does not require that ML dependency tree.

In an [independent isolated candidate
trial](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/40479430952),
pinned `ruflo@3.63.3` plus `@metaharness/router@0.4.0` installed via
`npm ci --omit=optional --ignore-scripts`. All 80 repository tests and all
3 actual MCP bookkeeping task completions passed with no model/API usage.
`npm audit --omit=dev --omit=optional` reported **0 critical, 7 high,
0 moderate**. The remaining seven high advisories include `zod` and
upstream RuFlo / `@claude-flow/*` packages. The optional dependencies
remain **listed** in the npm lockfile but are **not installed** on the
runner. This is a reduced exposure profile, not a clean security audit.

A [second independent trial](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/40480508734)
added an **explicit, temporary major-version override `zod: 4.6.7`**.
That experiment passed `npm ci --omit=optional`, all 80 repository tests,
all 3 RuFlo MCP task persistence checks, and `npm audit --omit=dev --omit=optional`
with **zero reported advisories** (0 critical, 0 high, 0 moderate, 0 low).
The same pinned tree is now used by this **isolated lab benchmark only**.

**Compatibility warning:** `@claude-flow/cli@3.63.3`,
`@claude-flow/security@3.0.5` and `@claude-flow/shared@3.0.5`
explicitly declare Zod v3 ranges, not v4. The override deliberately violates
their declared constraints. Passing this narrow three-task benchmark is
**not evidence that other RuFlo functions are compatible or safe** with Zod v4.
Do not reuse this overridden tree in a production service or connect Proffera
or Supervisor. The npm audit gate continues to fail closed on any advisory;
independent source-level compatibility review and upstream-supported Zod
migration are still required **before merging PR #10**.

## Confirmed Zod 4 incompatibility — release blocker (2026-10-27)

A source-level review of **tagged upstream RuFlo v3.63.3** identified
Zod 3-only APIs in core validation paths. The independent read-only
[hosted compatibility run](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/40484466713)
then reproduced the following failures using the exact pinned lab dependencies:

- [`@claude-flow/shared/src/core/config/validator.ts`](https://github.com/ruvnet/ruflo/blob/v3.63.3/v3/%40claude-flow/shared/src/core/config/validator.ts):
  converts validation errors with `error.errors.map(...)`. In installed
  Zod 4.6.7, error details live at `error.issues` and `error.errors`
  is undefined. Calling the shipped `validateAgentConfig({})` throws
  `TypeError: Cannot read properties of undefined (reading 'map')`.
- [`@claude-flow/security/src/input-validator.ts`](https://github.com/ruvnet/ruflo/blob/v3.63.3/v3/%40claude-flow/security/src/input-validator.ts):
  uses Zod 3 API shapes in security validators and its custom error map.
  Importing the **installed** compiled `@claude-flow/security/dist/input-validator.js`
  throws `TypeError: z.string(...).ip is not a function` with Zod 4.6.7.

The test checks the compiled package's real validation paths, not only
Zod's type declarations. The release gate intentionally **fails closed**.
The existing 80 repository tests and three MCP task completions do not
exercise these negative-input/security module paths, and the zero-advisory
`npm audit --omit=dev --omit=optional` result does not imply Zod 4
API compatibility. This is a confirmed functional incompatibility,
not a hypothetical limitation.

**Decision: keep PR #10 in Draft and do not merge this Zod 4 override.**
A safe release requires a supported upstream migration (or an independently
reviewed compatibility fix with full negative-input, security and integration
tests), plus repeatable lockfile and audit verification. Do not use this
experimental dependency override in Proffera, Supervisor or production.

## Zod 4 compatibility patch feasibility — lab-only (2026-10-27)

The [upstream tagged release v3.63.4](https://github.com/ruvnet/ruflo/releases/tag/v3.63.4)
still contains the same Zod 3-specific API calls in the relevant source files.
It is not evidence of an upstream Zod 4 compatibility migration.

A **separate, read-only GitHub Actions workflow**:
[`ruflo-zod-compat-research.yml`](../../.github/workflows/ruflo-zod-compat-research.yml)
installs the exact pinned experimental RuFlo 3.63.3 / Zod 4.6.7 dependencies
in a disposable runner directory, never in the Hub repository or production.
The guarded [migration feasibility script](compat/zod4-trial.mjs)
then modifies **only that temporary npm installation**, refusing to edit
unknown upstream code (exact known pattern-count checks).

The experimental changes cover six Zod 3-to-4 migration sites in
`@claude-flow/shared` and `@claude-flow/security`: `ZodError.errors`
to `issues`, `invalid_string` to `invalid_format`, issue `validation`
to `format`, returning `undefined` for default error-map fallthrough,
and replacing the removed `z.string().ip()` API with Zod 4 IPv4/IPv6 schemas.

The [independent GitHub run #40486836807](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/40486836807)
passed **20 focused compatibility smoke tests**, including failing configuration
input, email, IPv4/IPv6, command metacharacters, traversal paths, safe strings,
and security defaults. All work was contained in the disposable runner;
no source repository edits or provider calls were needed.

**This proves only that those specific paths can be migrated with a small
patch. It is NOT a fix to upstream npm packages, a broad regression test,
a TypeScript type-check of an upstream source patch, a security certification,
or permission to merge PR #10.** Its main compatibility gate remains
intentionally red on the unmodified installed upstream package. Require
an upstream-supported migration and independent code/security review before
any production reuse.

## Before merge: dependency and security release gate

Earlier runs installed only `ruflo@3.56.10` with floating transitive versions and reported deprecated-package warnings (including koa-router, prebuild-install, node-domexception and OpenTelemetry packages). These warnings alone do not prove exploitable vulnerabilities.

The dedicated lockfile and exact dependency versions are now committed in
`benchmarks/offline/deps/`. The isolated workflow checks the exact lockfile
SHA-256 and uses `npm ci --omit=optional --ignore-scripts` (not fresh registry resolution).
The independent dependency/security audit, exact-head PR checks and reviewer
sign-off are **still required** before release. Keep this lab independent of
Proffera, Supervisor and production credentials. Passing CI is not a
supply-chain security approval.
