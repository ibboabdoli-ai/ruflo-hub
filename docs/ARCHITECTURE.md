# Architecture and trust boundaries

## One hub, multiple isolated projects

The Hub is a **source-controlled registry**, not an always-on agent runner, control plane or a service with credentials to all projects. Each project retains independent permissions, review rules, credentials, runtime state and memory. Cross-project knowledge sharing requires deliberate, sanitized exports; do not share raw project memory or private code.

## Project-specific governance

- Proffera already has its own Supervisor/Worker, Task Packet, Fail-Closed admission, CI and exact-head final gates. This hub has no authority to enqueue or override tasks there.
- Customer projects may contain proprietary code or personal data. Never copy secrets, customer data or project memories into Hub profiles.
- No repository modification, merge, production deployment, payment operation, or secret management is permitted by this starter.

## Initial implementation

Only `npm run validate`, `npm run projects` and `npm test` run locally. The CI workflow checks the static manifest schema. It does not call RuFlo, the GitHub API or an AI API. Connecting it to a runtime is a separate future project requiring explicit owner approval.

## Proposed future topology

1. Maintain one shared Git repo with reusable conventions and reviewed adapters.
2. Keep one workspace/MCP process and state per *project*; avoid granting a single background daemon credentials to every repo.
3. Require per-project allowlists, short-lived credentials, network restrictions and explicit approval for writes.
4. Run all candidate changes against each project's own rules; projects with an existing Supervisor keep that Supervisor as the only publication authority.

Treat any future orchestration tool's claimed permission checks as **unverified** until tested in a sandbox.
