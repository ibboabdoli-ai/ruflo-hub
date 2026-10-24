import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const SHA='9ac8b38df37cdcb8a917ea4c10f2cc9f79a750ca';
const target=resolve('scripts/proffera-public-mcp.mjs');
const call=(id,method,params)=>JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n';
function execute(frames,{mode='good',expected=SHA}={}){
  const fixture={number:941,state:'open',draft:false,merged:false,changed_files:40,
    head:{sha:mode==='stale'?'a'.repeat(40):SHA},base:{repo:{full_name:'ibboabdoli-ai/Proffera'}}};
  const checks={total_count:2,check_runs:[
    {head_sha:SHA,name:'validation',status:'completed',conclusion:'success'},
    {head_sha:SHA,name:'second',status:'completed',conclusion:'skipped'}]};
  const mock=[
    'let calls=0;globalThis.fetch=async()=>{calls++;',
    mode==='403'
      ? 'return {ok:false,status:403,json:async()=>({private_secret:"NO_LEAK"})};'
      : 'return {ok:true,status:200,json:async()=>calls===1?'+JSON.stringify(fixture)+':'+JSON.stringify(checks)+'};',
    '};process.on("exit",()=>{if(calls>'+ (mode==='403'?1:2) +')process.stderr.write("MORE_THAN_ALLOWED_GETS")});'
  ].join('');
  const child=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(mock),target],{
    input:frames,encoding:'utf8',timeout:12000,maxBuffer:1024*1024,
    env:{PATH:process.env.PATH,PROFFERA_EXPECTED_SHA:expected,NODE_OPTIONS:''}
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
    assert.doesNotMatch(JSON.stringify(replies)+stderr,/NO_LEAK/);
  }
});
test('oversized frame discarded, subsequent ping survives',()=>{
  const {replies}=execute('x'.repeat(10000)+'\n'+call(9,'ping',{}));
  assert.deepEqual(replies.map(x=>x.id),[9]);
});
