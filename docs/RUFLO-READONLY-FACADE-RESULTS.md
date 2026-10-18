# Safe RuFlo MCP Facade — Result and Release Gate

Date: 2026-10-18, repository: ibboabdoli-ai/ruflo-hub.
Scope: Draft PR #1 on work/ruflo-three-agent-lab-20261018. Nothing merged or deployed.

## PASS: direct read-only MCP security contract, without model charges

The new MCP facade exports **exactly one** tool: `ruflo_read_agent_count`.
It uses true MCP annotations: readOnlyHint=true, destructiveHint=false,
openWorldHint=false, idempotentHint=true, with no arguments permitted.

A disposable GitHub Actions run verified:
- Valid MCP initialize and list of one annotated tool.
- Attempts to call `agent_spawn` are rejected.
- Arguments other than the empty object are rejected.
- A genuine pinned RuFlo 3.56.10 MCP `agent_list` call returned
  `agentCount: 0` (empty disposable sandbox; this is expected).
- No raw agent metadata or synthetic credential markers leaked.

Evidence: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39166582500
Configuration validator passed at exact related source SHA:
https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39166582520

## PASS: Codex CLI can register the facade without an API key

`codex mcp get ruflo_safe --json` confirmed an enabled MCP launcher pointing
at the intended facade script inside disposable CODEX_HOME. The previously
discovered full Ruflo MCP server also launched and provided 358 tools.
Evidence: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39166993184

## NOT YET PASSING: Codex model tool discovery / invocation

1. Initial bounded model test exposed only the read-only facade to Codex.
   Codex completed normally, but its JSON events contained **zero MCP tool
   calls**, so the native invocation was correctly reported INCOMPLETE.
   https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39166752280
   Provider usage reported 53,608 input and 375 output tokens.
2. After removing an optional Codex `enabled_tools` override and making the
   prompt more explicit, Codex again completed with zero MCP tool events.
   Its final message was **STATUS: UNAVAILABLE**; no approval denial was
   observed in this run.
   https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39167126011
   Provider usage reported 42,659 input and 243 output tokens.

**DO NOT claim that Codex successfully executed this MCP tool.** We have proven
the facade's direct behavior and the CLI registration, but not that Codex
published the tool to the model at runtime. This is distinct from the earlier
unannotated-RuFlo call failing with
`MCP tool call requires approval, but approval policy is never`.

## Cost/security stop

Both tests sent real bounded Codex model requests and may incur provider
charges. Provider token accounting is not a verified invoice. No more paid
tests should be run until the model-visible MCP tool catalog or startup error
is diagnosed. The paid GitHub Actions job is gated behind an **explicit**
`[run-paid-codex-test]` commit marker. Documentation-only commits do not
launch paid tests.

No Production or other repositories were touched. No GitHub write/merge
token, real receipt data, Proffera state, or deployment credentials were
available to the test runtime.

## Next debug steps (no API charges)

1. Inspect the Codex-side MCP startup/handshake diagnostic log rather than
   relying on `codex mcp get` (which only validates stored config).
2. In the isolated workspace, verify that Codex actually starts the facade
   and receives the single annotated `tools/list` tool definition.
3. Investigate whether Codex sandbox or server-policy configuration hides
   local stdio MCP tools in `codex exec` mode.
4. Re-run at most one bounded model call only after a zero-cost startup
   diagnostic confirms tool exposure. Require a **completed** MCP tool event,
   not merely a registered server or model response.
5. Do not use `--dangerously-bypass-approvals-and-sandbox` or broaden access
   to full RuFlo write-capable MCP tool sets.
