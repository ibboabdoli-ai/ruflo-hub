import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCodexMcpReceipt} from '../lib/codex-mcp-proof.mjs';

function receipt(actual=0, reported=actual) {
  const text=JSON.stringify({agentCount:actual,source:'local-ruflo-mcp',readOnly:true});
  return [
    {type:'thread.started'},
    {type:'turn.started'},
    {type:'item.started',item:{id:'call-1',type:'mcp_tool_call',
      server:'ruflo_safe',tool:'ruflo_read_agent_count',status:'in_progress'}},
    {type:'item.completed',item:{id:'call-1',type:'mcp_tool_call',
      server:'ruflo_safe',tool:'ruflo_read_agent_count',status:'completed',
      result:[{type:'text',text}]}},
    {type:'item.completed',item:{type:'agent_message',text:'STATUS: '+reported+' agents.'}},
    {type:'turn.completed'}
  ];
}

test('exact matching upstream read-only count is accepted',()=>{
  assert.deepEqual(verifyCodexMcpReceipt(receipt(0)),{ok:true,agentCount:0});
  assert.deepEqual(verifyCodexMcpReceipt(receipt(3)),{ok:true,agentCount:3});
});

test('fabricated final count is rejected, even when correctly formatted',()=>{
  assert.match(verifyCodexMcpReceipt(receipt(0,7)).reason,/disagrees/);
});

test('duplicate or unrelated MCP calls invalidate the receipt',()=>{
  const events=receipt();
  events.splice(4,0,...events.slice(2,4));
  assert.equal(verifyCodexMcpReceipt(events).ok,false);
  const wrong=receipt();
  wrong[3].item.tool='agent_spawn';
  assert.equal(verifyCodexMcpReceipt(wrong).ok,false);
});

test('missing, malformed, or forged upstream result is rejected',()=>{
  const missing=receipt();
  delete missing[3].item.result;
  assert.equal(verifyCodexMcpReceipt(missing).ok,false);
  const forged=receipt();
  forged[3].item.result=[{type:'text',text:JSON.stringify({
    agentCount:0,source:'other-server',readOnly:true})}];
  assert.equal(verifyCodexMcpReceipt(forged).ok,false);
});

test('read-only payload nested in MCP content container is supported',()=>{
  const value={agentCount:2,source:'local-ruflo-mcp',readOnly:true};
  const events=receipt(2);
  events[3].item.result=JSON.stringify({content:[{type:'text',text:JSON.stringify(value)}]});
  assert.equal(verifyCodexMcpReceipt(events).agentCount,2);
});

test('failed process, unavailable final, and missing completed turn fail closed',()=>{
  assert.equal(verifyCodexMcpReceipt(receipt(),1).ok,false);
  const bad=receipt();
  bad[4].item.text='STATUS: UNAVAILABLE';
  assert.equal(verifyCodexMcpReceipt(bad).ok,false);
  const partial=receipt().slice(0,-1);
  assert.equal(verifyCodexMcpReceipt(partial).ok,false);
});
