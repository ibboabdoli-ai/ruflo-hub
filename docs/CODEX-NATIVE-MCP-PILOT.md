# RuFlo + Codex pilot — exact status on 18 October 2026

## What passed
- Three CLI-registered roles in a temporary Ruflo 3.56.10 workspace, verified against its agent list.
- OpenAI API key was available in an isolated GitHub Actions job and the provider metadata endpoint answered.
- Three short model responses for Researcher → Coder → Tester passed a custom synthetic test harness. **Not Ruflo-native orchestration.**
- Ruflo MCP over stdio completed a real initialize handshake, discovered **358 tools**, and Codex 0.163.0 configured the Ruflo MCP server.
- Direct calls to Ruflo MCP `swarm_status` and `agent_list` both returned `isError=false` when invoked by our no-secret MCP client.

## What failed / remains unproven
- **Codex native MCP tool execution: BLOCKED.** Codex model gpt-5.6-luna issued real MCP tool-call attempts, including `swarm_status` and `agent_list`, but Codex classified the calls `failed` with the exact error:
  `MCP tool call requires approval, but approval policy is never`.
- This happened despite applying a tool allowlist to `agent_list`, setting its approval mode to `auto`, and testing on-request approval policy. Do **not** claim a completed MCP call.
- Multi-agent reasoning, native RuFlo coordination/agent handoff, autonomous repair, direct Codex tool-based write/test cycles and persistence have not been demonstrated.
- One intermediate job failed from a test-script syntax typo, not a provider/tool failure. A `node --check` safety step was then added.

## Evidence
- MCP handshake + native tools discovery: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39117247836
- Direct read-only Ruflo MCP calls: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39117626968
- First real Codex MCP request reached tool layer but was not approved: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39117463467
- Permission denial confirmed by diagnostic: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39117783859
- Explicit auto-permission restriction still denied: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39118069867
- On-request override still denied: https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39118229760

## Safety / cost
- Only synthetic inputs. No Production, Proffera, Receipt AI source checkout, or write-access checkout token.
- Codex executes read-only in a temporary directory. The Ruflo MCP command was launched with both API-key environment variables scrubbed. The secret was made available only to Codex.
- Four short, bounded Codex attempts generated provider-reported usage; not a verified billed dollar amount. Do not auto-retry.
- To prevent any more paid runs from routine PR edits, this workflow now requires an intentional `[run-paid-codex-test]` marker in a push commit message before its job may start.
- Main branch is unchanged. Draft PR only.

## Next engineering step (not executed)
Review Codex MCP approval policy or implement an audited **read-only** MCP facade exposing only a single schema-validated, properly annotated Ruflo health/agent-list operation. Prove that Codex can execute it in the ephemeral sandbox without interactive approval. Run one bounded model session after local smoke tests succeed, then reconsider a three-role native coordination pilot. Do not broaden permissions or add GitHub/Production keys to the agent runtime.
