# OpenAI + RuFlo hybrid: bounded synthetic pilot

**Selected path:** Use RuFlo for the role registry, task assignment and persisted results; use OpenAI for the three sequential role responses.

Only artificial `average([])` input is permitted in this pilot. Do not add repository fetching, real customer data, PR write permissions or Production credentials.

Safety gates in `lib/hybrid-openai.mjs`: the exact role order Researcher → Coder → Tester, exactly three attempted calls max (including failures), prompt length up to 1500 characters, up to 240 output tokens/request, response length up to 1500 characters, 25s request timeout, `store:false`, no retries and no upstream response-body logging. Automated offline regression tests cover these controls.

Workflow `.github/workflows/ruflo-tracked-openai-relay.yml` runs **only on a push to the dedicated trial branch** that changes the designated pilot script or workflow **and** contains the explicit commit marker `[run-paid-ruflo-tracked-test]`. It is not a persistent service. Branch-only GitHub workflows generally cannot be manually dispatched from the UI until they exist on the default branch. Therefore do not tell the owner to use a Run workflow button for this Draft PR.

Previous passing evidence: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39171029168 (three OpenAI model outputs stored and re-read as complete RuFlo tasks). These new safety tests do not establish fresh live provider execution unless a separately consented paid run occurs.

**Boundary:** The test harness performs the OpenAI calls and handoff; RuFlo owns task lifecycle. This is **not** native agent_execute or three autonomous RuFlo agents.

GitHub PR #1 remains Draft; no merge, deployment or Production access.
## Maintained pilot scope

The former exploratory workflows (unguarded OpenAI relay, credential preflight, CLI registration, duplicate native-offline probes and Codex startup experiments) were retired from this PR. Their past GitHub Actions run URLs remain historical evidence in the retained result reports, not active entrypoints. Keep only the bounded, explicitly marked paid hybrid workflow, the isolated read-only facade smoke workflow, and the independently marked single-call Codex MCP proof.

Do not infer source access, autonomous agent execution, or production readiness from the green CI or SonarQube checks. The current real-model evidence applies to the earlier fixture run, not the latest security refactor; a new paid end-to-end run requires separate authorization and a deliberate marker.
