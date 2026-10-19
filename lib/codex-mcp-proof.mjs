/**
 * Offline verifier for historical Codex -> strict read-only MCP event receipts.
 * This module never starts Codex, makes API requests, or reads credentials.
 */
function decodePayload(value) {
  if (typeof value === 'string') {
    try { return decodePayload(JSON.parse(value)); } catch { return null; }
  }
  if (Array.isArray(value)) {
    if (value.length !== 1 || value[0]?.type !== 'text') return null;
    return decodePayload(value[0].text);
  }
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value.content)) return decodePayload(value.content);
  if (Number.isSafeInteger(value.agentCount) && value.agentCount >= 0 &&
      value.agentCount <= 1000 && value.source === 'local-ruflo-mcp' &&
      value.readOnly === true) return value.agentCount;
  return null;
}

/**
 * Only exact, completed tool evidence proves the final count.
 * Do not accept a model's answer as proof without the upstream result.
 */
export function verifyCodexMcpReceipt(events, exitCode = 0) {
  const failure = reason => Object.freeze({ ok:false, reason });
  if (!Array.isArray(events) || exitCode !== 0) return failure('Invalid process status or events');
  const calls = events.filter(e => e?.item?.type === 'mcp_tool_call' &&
    (e?.type === 'item.started' || e?.type === 'item.completed' || e?.type === 'item.failed'));
  if (calls.length !== 2) return failure('Expected exactly one MCP call lifecycle');
  const [started, completed] = calls;
  if (started.type !== 'item.started' || completed.type !== 'item.completed' ||
      started.item?.server !== 'ruflo_safe' ||
      completed.item?.server !== 'ruflo_safe' ||
      started.item?.tool !== 'ruflo_read_agent_count' ||
      completed.item?.tool !== 'ruflo_read_agent_count' ||
      (started.item.id !== undefined && completed.item.id !== started.item.id) ||
      completed.item?.status !== 'completed') {
    return failure('Unexpected MCP identity, lifecycle or status');
  }
  const upstreamCount = decodePayload(completed.item.result);
  if (upstreamCount === null) return failure('Missing or invalid exact MCP tool result');
  const finals = events.filter(e => e?.type === 'item.completed' &&
    e?.item?.type === 'agent_message' && typeof e.item.text === 'string');
  if (finals.length !== 1) return failure('Expected one Codex final answer');
  const match = /^STATUS:\s*(\d+)\s+agents?\.?$/i.exec(finals[0].item.text.trim());
  if (!match || !Number.isSafeInteger(Number(match[1]))) return failure('Invalid final status format');
  const reportedCount = Number(match[1]);
  if (reportedCount !== upstreamCount) return failure('Model count disagrees with MCP result');
  if (events.filter(e => e?.type === 'turn.completed').length !== 1) {
    return failure('Expected exactly one completed turn');
  }
  return Object.freeze({ok:true,agentCount:upstreamCount});
}
