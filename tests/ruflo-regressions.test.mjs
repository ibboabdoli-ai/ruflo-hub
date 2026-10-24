import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {nativeExecutionWasBlocked} from '../lib/native-execution-guard.mjs';

const facade=resolve('scripts/ruflo-readonly-facade.mjs');
const request=(id,method='ping',params={})=>
  JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n';
function runFacade(input,bin=process.execPath){
  const child=spawnSync(process.execPath,[facade],{
    input,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
    env:{...process.env,RUFLO_BIN:bin}
  });
  assert.ifError(child.error);
  assert.equal(child.signal,null);
  assert.equal(child.status,0,child.stderr);
  return child.stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
}

test('each complete incoming MCP frame is bounded independently, not the whole chunk',()=>{
  const batch=[1,2,3].map(id=>request(id,'ping',{pad:'x'.repeat(27000)})).join('');
  assert.ok(batch.length>65536);
  const replies=runFacade(batch);
  assert.deepEqual(replies.map(x=>x.id),[1,2,3]);
  assert.ok(replies.every(x=>x.result&&Object.keys(x.result).length===0));
});

test('oversized MCP frame is discarded through newline; a later valid frame works',()=>{
  const replies=runFacade('x'.repeat(70000)+'\n'+request(7));
  assert.deepEqual(replies.map(x=>x.id),[7]);
});

test('upstream process that closes stdin fails safely, without terminating the facade',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ruflo-closed-stdin-'));
  const executable=join(dir,'fake-ruflo');
  try{
    writeFileSync(executable,`#!/usr/bin/env node
process.stdin.destroy();
process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:1,result:{serverInfo:{name:'fake'}}})+'\\n');
setTimeout(()=>process.exit(0),150);
`,{mode:0o755});
    const replies=runFacade(request(11,'tools/call',{name:'ruflo_read_agent_count',arguments:{}}),executable);
    assert.equal(replies.length,1);
    assert.equal(replies[0].id,11);
    assert.equal(replies[0].error?.code,-32001);
    assert.equal(replies[0].error?.message,'Read-only RuFlo lookup failed');
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
});

test('explicit native agent success never counts as a blocked provider',()=>{
  assert.equal(nativeExecutionWasBlocked({isError:false,data:{success:true,provider:'ollama'}}),false);
  assert.equal(nativeExecutionWasBlocked({isError:true,data:{success:true,error:'no LLM provider'}}),false);
  assert.equal(nativeExecutionWasBlocked({isError:false,data:{provider:'ollama'}}),false);
});
test('clear failure evidence counts as blocked, unclear outcomes do not',()=>{
  assert.equal(nativeExecutionWasBlocked({isError:true,data:{}}),true);
  assert.equal(nativeExecutionWasBlocked({isError:false,data:{success:false}}),true);
  assert.equal(nativeExecutionWasBlocked({isError:false,data:{message:'No LLM provider configured'}}),true);
  assert.equal(nativeExecutionWasBlocked({isError:false,data:{success:null,message:'no LLM provider'}}),false);
  assert.equal(nativeExecutionWasBlocked({isError:false,data:{message:'ready'}}),false);
});
