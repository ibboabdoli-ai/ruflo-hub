# Security rules for RuFlo Hub

This repository is **public**. Never commit tokens, keys, personal/customer data, provider configurations, private source code or raw AI conversations.

- No centralized account credentials. Each project must keep independent access and storage.
- Hub does not receive push, merge, deployment, billing or secret-management permissions.
- Future use of RuFlo requires a pinned reviewed upstream version and a separate sandbox.
- Avoid public HTTP MCP listeners; prefer local stdio in any future pilot.
- Treat files in this repository as *policy descriptions only*, not an enforced security sandbox.
- Proffera's existing Supervisor and owner authorization remain authoritative.
- Review all external actions and packages before installing or executing them.
- GitHub Free supports private repositories too; public visibility is not required just to avoid a repository subscription.


## Paid workflow safety gate (2026-10-19)

Draft PR #1 disables paid Actions workflow steps; current checks use no API secrets.
A commit-message marker is **not** authorization. Existing repository-level
Actions secrets, if any, require owner-admin removal or rotation; this was
**not** performed by the GitHub connector. Future paid experiments require a
verified protected GitHub Environment with required owner review, an independent
hard request/token budget, and separate explicit approval for the exact source.
See [docs/PAID-PILOT-APPROVAL.md](docs/PAID-PILOT-APPROVAL.md).
