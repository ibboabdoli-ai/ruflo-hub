# RuFlo + Codex pilot — exact status on 18 October 2026

## What passed
- Three CLI-registered roles in a temporary Ruflo 3.56.10 workspace, verified against its agent list.
- OpenAI API key was available in an isolated GitHub Actions job and the provider metadata endpoint answered.
- Three short model responses for Researcher → Coder → Tester passed a custom synthetic test harness. **Not Ruflo-native orchestration.**
- Ruflo MCP over stdio completed a real initialize handshake, discovered **358 tools**, and Codex 0.163.0 configured the Ruflo MCP server.
- Direct calls to Ruflo MCP `swarm_status` and `agent_list` both returned `isError=false` when invoked by our no-secret MCP client.

## Earlier failures (historical; read-only tool execution subsequently succeeded)
- **Earlier Codex native MCP tool execution: BLOCKED at that time.** Codex model gpt-5.6-luna issued real MCP tool-call attempts, including `swarm_status` and `agent_list`, but Codex classified the calls `failed` with the exact error:
  `MCP tool call requires approval, but approval policy is never`.
- This happened despite applying a tool allowlist to `agent_list`, setting its approval mode to `auto`, and testing on-request approval policy. Those early attempts did **not** complete an MCP call.
- Multi-agent reasoning, native RuFlo coordination/agent handoff, autonomous repair, direct Codex tool-based write/test cycles and persistence have not been demonstrated.
- One intermediate job failed from a test-script syntax typo, not a provider/tool failure. A `node --check` safety step was then added.

## Later 18 October result — read-only MCP call succeeded
- [Run 39169213646](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39169213646) successfully executed one `ruflo_safe.ruflo_read_agent_count` through Codex in an isolated read-only sandbox. The completed tool event was followed by `STATUS: 0 agents.`
- The earlier approval/startup failures above are historical. This proves **one read-only Codex-to-RuFlo tool invocation**, not RuFlo-native autonomous multi-agent execution.

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
The single-tool, audited read-only facade was built and its successful Codex invocation was recorded above. Next, complete the current PR review, revalidate guardrails on the latest source, and separately approve any new bounded live pilot. **Native autonomous three-agent work remains unproven.** Do not broaden permissions or add GitHub/Production keys to the agent runtime.
