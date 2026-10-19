#!/usr/bin/env node
/**
 * Offline historical Codex MCP receipt auditor. No API keys, model calls,
 * project checkout, GitHub mutation, or background processes.
 */
import {readFileSync} from 'node:fs';
import {verifyCodexMcpReceipt} from '../lib/codex-mcp-proof.mjs';

const filename=process.argv[2];
if (process.argv.length!==3 || !filename) {
  console.error('Usage: node scripts/ruflo-codex-receipt-audit.mjs <local-codex-jsonl-file>');
  process.exitCode=2;
} else {
  try {
    const text=readFileSync(filename,'utf8');
    if (text.length>1024*1024) throw Error('Receipt exceeds 1 MiB limit');
    const events=text.split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));
    const verdict=verifyCodexMcpReceipt(events);
    if (!verdict.ok) {
      console.error('FAIL: '+verdict.reason);
      process.exitCode=1;
    } else {
      console.log('PASS: exactly one read-only MCP call, verified agentCount='+verdict.agentCount);
    }
  } catch {
    console.error('FAIL: unreadable or malformed offline JSONL evidence');
    process.exitCode=1;
  }
}
