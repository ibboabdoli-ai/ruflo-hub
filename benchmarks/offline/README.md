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
2. `ruflo` launches **real** pinned RuFlo v3.56.10 in an isolated local
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
restricted to a fixed lab branch and pins the upstream RuFlo package version.
Transitive npm dependencies are **not** lockfile-pinned, so this does not
constitute supply-chain reproducibility or security approval of external code.

## Acceptance evidence

A passing run must demonstrate:
- Defective input >=3 failing checks; repaired identical oracle 7/7.
- Both arms complete with 0 provider calls and 0 source repository edits.
- The RuFlo arm completes and reloads exactly three native task records.
- No runtime writes, secrets or production access.
- Store plain structured timing in workflow logs/summary; do not invent
  speedup percentages.

Workflow (branch-limited):
`https://github.com/ibboabdoli-ai/ruflo-hub/actions/workflows/ruflo-offline-benchmark.yml`

This test is **phase 1**. A genuine Codex-only vs Codex+RuFlo comparison would
require two independent, equally budgeted model trials on held-out tasks,
blinded scoring, provider-level hard spend limit, an owner-reviewed key
environment and **separate explicit authorization**. Never substitute this
free test for that evidence.
