# RuFlo read-only MCP facade
This is a **test-only** stdio MCP proxy, not a general-purpose RuFlo controller.
It exposes exactly one tool, \`ruflo_read_agent_count\`, with no arguments.
Its metadata declares \`readOnlyHint: true\`, \`destructiveHint: false\`,
\`openWorldHint: false\`, and \`idempotentHint: true\`. These are truthful because
it forwards only a bounded \`agent_list\` query to a local RuFlo 3.56.10 instance.

Security controls:
- Strict tool name allowlist; no other upstream MCP tools can be requested.
- Zero user-supplied parameters accepted; arguments are enforced server-side.
- Spawn child with an explicit environment allowlist, not the parent's credential environment.
- Sanitize result to a single validated nonnegative integer (count); no raw agent
  metadata, errors, file paths or secrets are returned.
- 25-second upstream timeout, 64 KiB max response, one in-flight call.
- Only on a disposable GitHub Actions runner. No GitHub write token, Production
  data, applications or customer projects are connected.
- **No inference model** is used for the base contract test.

These MCP annotations convey information to clients but do not grant authorization
by themselves. The hard allowlist and result validation are the actual boundary.
The previous native Codex → unannotated RuFlo call failed with:
\`MCP tool call requires approval, but approval policy is never\`.
The next test should verify a **completed**, not merely attempted, Codex MCP call
with this facade, while keeping Codex's sandbox read-only and approval policy
unchanged. No \`--dangerously-bypass-approvals-and-sandbox\` flag is permitted.
