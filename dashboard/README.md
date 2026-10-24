# RuFlo Hub — Public read-only dashboard v2

GitHub Pages: https://ibboabdoli-ai.github.io/ruflo-hub/ (published previously by the owner; publish this revision **manually** after review).

## Sources and claims

The static Persian dashboard reads **only public GitHub endpoints**, without an account, credential, paid model, agents, writes, webhooks, or access to Proffera private source/Supervisor.

- Current \`main\` branch SHA and corresponding check runs for exactly \`ibboabdoli-ai/ruflo-hub\` and \`ibboabdoli-ai/Proffera\`.
- Up to **20 check runs per main branch** (\`filter=latest\`). The GitHub API may report many more: e.g. Proffera historically had over 2,000. A sample is always visibly labeled **ناقص**; its counters are not project-wide CI results. Only up to six of the fetched checks for each project appear in the list.
- Up to **five open PRs per repository**, sorted by updated time. Counts capped at five are marked \`+\`, never claimed as complete.
- Public Proffera PR #941 head and selected related check runs. These are **CI evidence about one PR**, not operational telemetry or Supervisor health.
- RuFlo Hub public \`profiles/proffera.json\` showing read-only, disconnected permissions. It is **not** proof of network isolation of the live system.

All external content is rendered through DOM \`textContent\`; PR URLs are built from hard-coded public repos and validated numeric PR numbers. No remote CSS/JS is loaded. CSP restricts all browser sources. Fetches are unauthenticated GET with fixed destinations and no automatic refresh/retries. Check runs are verified against the current retrieved SHA; truncated/mismatched/403 responses show **نامشخص** or **ناقص**, never an invented PASS. One refresh may use several anonymous GitHub API requests; frequent clicking may encounter GitHub rate limiting.

## Local / CI verification

\`node --check dashboard/app.js && node --test tests/dashboard-static.test.mjs tests/dashboard-behavior.test.mjs\`

The main repo \`npm test\` also runs the tests. The tests use a sandboxed mock DOM and injected read-only fetch implementation to exercise **all-403**, **partial**, **complete**, **mismatched SHA**, **sampled CI**, and **HTML injection** conditions.

## Publication (still manual and owner-controlled)

The publisher remains \`/.github/workflows/dashboard-pages.yml\`: \`workflow_dispatch\` only, guarded for \`main\` in the exact repo, with a short-lived GitHub Pages-only OIDC job. It ships only \`dashboard/\`, not project source or secrets.

Once PR review and hosted checks pass and the PR has been merged, the owner visits:
https://github.com/ibboabdoli-ai/ruflo-hub/actions/workflows/dashboard-pages.yml

Choose **Run workflow → main**, inspect the deployment, and open https://ibboabdoli-ai.github.io/ruflo-hub/ . A merge alone does **not** update the existing Pages site. Do not automate Pages deployment without separate authorization.

No user interface operation can change GitHub or Proffera. Future private Supervisor status would require a separately reviewed, opt-in architecture and explicit authorization.
