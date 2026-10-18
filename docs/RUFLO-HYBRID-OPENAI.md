# OpenAI + RuFlo hybrid: bounded synthetic pilot

**Selected path:** Use RuFlo for the role registry, task assignment and persisted results; use OpenAI for the three sequential role responses.

Only artificial `average([])` input is permitted in this pilot. Do not add repository fetching, real customer data, PR write permissions or Production credentials.

Safety gates in `lib/hybrid-openai.mjs`: the exact role order Researcher → Coder → Tester, exactly three attempted calls max (including failures), prompt length up to 1500 characters, up to 240 output tokens/request, response length up to 1500 characters, 25s request timeout, `store:false`, no retries and no upstream response-body logging. Automated offline regression tests cover these controls.

Workflow `.github/workflows/ruflo-tracked-openai-relay.yml` runs **only on a push to the dedicated trial branch** that changes the designated pilot script or workflow **and** contains the explicit commit marker `[run-paid-ruflo-tracked-test]`. It is not a persistent service. Branch-only GitHub workflows generally cannot be manually dispatched from the UI until they exist on the default branch. Therefore do not tell the owner to use a Run workflow button for this Draft PR.

Previous passing evidence: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39171029168 (three OpenAI model outputs stored and re-read as complete RuFlo tasks). These new safety tests do not establish fresh live provider execution unless a separately consented paid run occurs.

**Boundary:** The test harness performs the OpenAI calls and handoff; RuFlo owns task lifecycle. This is **not** native agent_execute or three autonomous RuFlo agents.

GitHub PR #1 remains Draft; no merge, deployment or Production access.