# RuFlo + Proffera public MCP observation lab

**Scope:** one explicitly approved, disposable GitHub Actions run. The sandbox
starts the *existing* RuFlo MCP read-only facade and a *separate*, single-tool
Proffera public-observation MCP stdio server. Both are exercised by a small test
client. This checks MCP compatibility and isolation; it does **not** attach
RuFlo agents to Proffera, update the Proffera Supervisor, or enable ongoing
monitoring. The Proffera profile must remain disconnected.

The new stdio server in scripts/proffera-public-mcp.mjs exposes exactly one
tool: proffera_observe_public_pr_941. It accepts **no tool arguments** and
requires an exact, explicit PROFFERA_EXPECTED_SHA before starting. Its only
network access is through the existing metadata-only allowlisted observer:
public GET of PR #941 and GET of its exact-HEAD check-run metadata.

Controls: no API token or paid model; no arbitrary URL, repository, commit
selection, source file, patch, PR comment, network listener, production resource
or customer data. One observation attempted per process, no retries, an
8-second HTTP timeout per endpoint, 8 KiB maximum incoming MCP frame, bounded
responses, sanitized errors and fail-closed exact-SHA checks. Results are
**observations only**, never a merge authorization. If GitHub returns HTTP 403,
if the PR head moves, or if check metadata is incomplete, the live step fails
with NOT VERIFIED rather than fabricating a PASS.

Hosted job: .github/workflows/ruflo-proffera-public-observer.yml, triggered
only by changes to the dedicated work branch. The job installs pinned
ruflo@3.56.10 with lifecycle scripts disabled, runs both stdio MCP probes
without provider credentials and checks for checkout mutations. The disposable
test environment is discarded after execution.

Offline regression: node --test tests/proffera-public-mcp.test.mjs mocks the
network and checks single-tool inventory, denied execution/write tools,
forbidden tool arguments, one-attempt limit, stale PR head, HTTP 403, redaction,
and oversized-frame recovery. Offline tests do not prove network connectivity.

**No merge/deploy/production authorization.** Any later persistent adapter,
Proffera private-source read, actual RuFlo agent, paid model execution, or
Supervisor integration requires separate review and explicit approval.
