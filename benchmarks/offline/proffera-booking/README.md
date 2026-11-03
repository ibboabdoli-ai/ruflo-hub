# Proffera-like booking-duration scenario — isolated zero-key pilot

**Status: VERIFIED FOR SYNTHETIC TASK BOOKKEEPING ONLY; NOT A PRODUCTION INTEGRATION.**

This is a **public, invented** scenario loosely modeled on manually changing a
service's duration from **180 to 210 minutes**. No Proffera source, configuration,
users, database rows, real appointments, APIs, Supervisor, or service credentials
are accessed or modified. It is not a code audit or an accurate reimplementation
of Proffera's actual booking rules.

## Test scenario

A technician/owner changes the service duration **manually**. For the day-local
09:00–17:00 availability window, a prior appointment remains 09:00–12:00.
The new service duration is 210 minutes and slots are generated on a 30-minute
grid. Valid starts after the existing appointment are **12:00, 12:30, 13:00,
13:30**; starting at 14:00 would finish at 17:30 and must not be shown.
Already-booked appointments keep their own start/end times.

The baseline fixture deliberately hardcodes 180 minutes and skips input
validation. **7/12** fixed requirements fail initially; the independent,
pre-reviewed pure reference passes **12/12**. These include boundary adjacency,
overlap, closing-time limits, invalid duration/step, invalid booking intervals,
and protection against mutating the input booking list. Times are plain integer
minutes of one synthetic day: **no time zone, DST, midnight crossing, multi-staff
or resource management**. This does not establish correctness for Proffera.

## Execution

Two experimental arms apply the **identical, pre-reviewed static patch**:

- Direct: run the reference-copy-and-test sequence in a temporary directory.
- RuFlo: start the **real** pinned RuFlo MCP CLI, create 3 roles, assign and
  complete 3 tasks (researcher/coder/tester), **verify the persisted result
  of each native task**, and run the same reference-copy-and-test sequence.

A test harness performs the role actions: no agent independently investigates
the Proffera code, writes a fix, or executes a language model. This measures
RuFlo MCP coordination overhead, **not** autonomous coding, Codex productivity,
quality improvements or real Proffera functionality.

## Safety and costs

- Public GitHub standard hosted runner with `contents: read`,
  `persist-credentials: false`, no persistent credential in the MCP child.
- Model/provider and cloud/DB tokens blank; **0 model API calls**, **no paid
  inference**. Runner usage remains subject to the GitHub account's terms.
- Only temporary scratch directories and a temporary, pinned npm install are
  written. Both cases test synthetic objects, not user/customer data.
- Original upstream `ruflo@3.63.3`, `@metaharness/router@0.4.0`, and
  `zod@4.6.7` experimental override are **intentionally not supported
  together across all RuFlo code**. The confirmed Zod 4 runtime validator
  incompatibility still blocks [Hub PR #10](https://github.com/ibboabdoli-ai/ruflo-hub/pull/10)
  and [issue #11](https://github.com/ibboabdoli-ai/ruflo-hub/issues/11).
  This experiment **does not waive** that blocker, authorize deployment,
  or imply that RuFlo's security validators are compatible.
- `npm audit --omit=dev --omit=optional` for the **installed non-optional**
  tree returned **0 high, 0 critical, 5 moderate** on 2026-11-03.
  This is not a complete security review or vulnerability-free claim.

## Independently verified hosted result

[GitHub Actions run #41654055478](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/41654055478)
on the isolated lab branch:
- **85/85** repository tests pass.
- Synthetic baseline: **7/12** failing requirements; **12/12** pass with
  identical static reference in both experimental arms.
- RuFlo MCP: **3/3** persisted native task records successfully completed.
- Experimental measured arm runtimes (installation excluded): **5.257 ms**
  direct; **439.416 ms** RuFlo. Not a fair Codex-vs-RuFlo comparison,
  not an end-to-end performance test, and not an improvement claim.
- Provider calls: **0**. Proffera source read: **no**; live booking edits:
  **none**; GitHub tracked source edits by job: **none**.

Run from the branch with Node 22:

```bash
node --test tests/proffera-booking-offline.test.mjs
node benchmarks/offline/bench.mjs direct booking
# The real RuFlo arm additionally requires a verified pinned RuFlo CLI
# installed in disposable scratch and RUFLO_BIN pointing to that executable.
```

The branch-only workflow is at
`.github/workflows/ruflo-proffera-booking-zero-key.yml`.

**Next acceptance gate** before connecting to any actual project:
an owner-reviewed, read-only, restricted Proffera *source* audit in its own
environment, an upstream-supported RuFlo Zod compatibility baseline, and
real independent test evidence. No push/merge/production connection.
