import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const SHA='9ac8b38df37cdcb8a917ea4c10f2cc9f79a750ca';
const target=resolve('scripts/proffera-public-mcp.mjs');
const call=(id,method,params)=>JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n';
function execute(frames,{mode='good',expected=SHA}={}){
  const child=spawnSync(process.execPath,
    ['--import',resolve('tests/fixtures/proffera-public-fetch-fixture.mjs'),target],{
    input:frames,encoding:'utf8',timeout:12000,maxBuffer:1024*1024,
    env:{PATH:process.env.PATH,PROFFERA_EXPECTED_SHA:expected,PROFFERA_TEST_MODE:mode,NODE_OPTIONS:''}
  });
  assert.ifError(child.error);
  assert.equal(child.signal,null);
  assert.equal(child.status,0,child.stderr);
  return {replies:child.stdout.trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)),stderr:child.stderr};
}
test('read-only MCP inventory, one exact-SHA public observation, and no second call',()=>{
  const frames=call(1,'initialize',{})+call(2,'tools/list',{})+
    call(3,'tools/call',{name:'agent_execute',arguments:{}})+
    call(4,'tools/call',{name:'proffera_observe_public_pr_941',arguments:{}})+
    call(5,'tools/call',{name:'proffera_observe_public_pr_941',arguments:{}});
  const {replies,stderr}=execute(frames);
  assert.equal(stderr,'');
  assert.equal(replies.length,5);
  assert.deepEqual(replies.map(x=>x.id),[1,2,3,5,4]);
  assert.equal(replies[1].result.tools.length,1);
  assert.equal(replies[1].result.tools[0].annotations.readOnlyHint,true);
  assert.equal(replies[2].error.code,-32601);
  assert.equal(replies[3].error.code,-32000);
  const report=JSON.parse(replies[4].result.content[0].text);
  assert.equal(report.exactSha,SHA);
  assert.equal(report.changedFilesReported,40);
  assert.equal(report.checkRuns,2);
  assert.equal(report.checksSuccessful,1);
  assert.equal(report.repositoryMutations,false);
});
test('tool rejects unexpected arguments and mutation tools',()=>{
  const {replies}=execute(call(1,'tools/call',{name:'proffera_observe_public_pr_941',arguments:{url:'https://example.com'}})+
    call(2,'tools/call',{name:'github_write',arguments:{}}));
  assert.deepEqual(replies.map(x=>x.error.code),[-32602,-32601]);
});
test('403 and stale SHA stop with generic NOT VERIFIED and no response-body echo',()=>{
  for(const mode of ['403','stale']){
    const {replies,stderr}=execute(call(1,'tools/call',{name:'proffera_observe_public_pr_941'}),{mode});
    assert.equal(replies.length,1);
    assert.equal(replies[0].error.code,-32001);
    assert.equal(replies[0].error.message,'NOT VERIFIED: public metadata unavailable');
    assert.doesNotMatch(JSON.stringify(replies)+stderr,/SIMULATED_BODY_NOT_FOR_OUTPUT/);
  }
});
test('oversized frame discarded, subsequent ping survives',()=>{
  const {replies}=execute('x'.repeat(10000)+'\n'+call(9,'ping',{}));
  assert.deepEqual(replies.map(x=>x.id),[9]);
});

test('different SHA is rejected before accepting MCP requests',()=>{
  const child=spawnSync(process.execPath,
    ['--import',resolve('tests/fixtures/proffera-public-fetch-fixture.mjs'),target],{
    input:call(1,'tools/call',{name:'proffera_observe_public_pr_941'}),
    encoding:'utf8',timeout:10000,
    env:{PATH:process.env.PATH,PROFFERA_EXPECTED_SHA:'a'.repeat(40),PROFFERA_TEST_MODE:'good',NODE_OPTIONS:''}
  });
  assert.equal(child.status,1);
  assert.equal(child.stdout,'');
});

test('public MCP smoke does not forward the runner temporary-directory environment',()=>{
  const smoke=readFileSync(resolve('scripts/proffera-public-mcp-smoke.mjs'),'utf8');
  assert.doesNotMatch(smoke,/\\bTMPDIR\\b/);
  assert.match(smoke,/env:safeEnv/);
});
