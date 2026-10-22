import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPublicProfferaPr} from '../scripts/inspect-public-proffera-pr.mjs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const sha='9ac8b38df37cdcb8a917ea4c10f2cc9f79a750ca';
const response=body=>({ok:true,status:200,json:async()=>body});
function fixture(overrides={}) {
  return {number:941,state:'open',draft:false,merged:false,changed_files:40,
    head:{sha},base:{repo:{full_name:'ibboabdoli-ai/Proffera'}},...overrides};
}
function checks(overrides={}) {
  return {total_count:2,check_runs:[
    {head_sha:sha,name:'validation',status:'completed',conclusion:'success'},
    {head_sha:sha,name:'review',status:'completed',conclusion:'skipped'}
  ],...overrides};
}
function fakeFetch(first=fixture(),second=checks()) {
  const requests=[];
  const f=async(url,init)=>{
    requests.push({url,init});
    return response(requests.length===1?first:second);
  };
  return {f,requests};
}

test('two allowlisted public metadata GET requests; no authorization or writes',async()=>{
  const {f,requests}=fakeFetch();
  const result=await inspectPublicProfferaPr(sha,f);
  assert.deepEqual(requests.map(x=>x.url),[
    'https://api.github.com/repos/ibboabdoli-ai/Proffera/pulls/941',
    'https://api.github.com/repos/ibboabdoli-ai/Proffera/commits/'+sha+'/check-runs?filter=all&per_page=100'
  ]);
  for(const {init} of requests) {
    assert.equal(init.method,'GET');
    assert.equal(init.redirect,'error');
    assert.equal(init.headers.Authorization,undefined);
    assert.equal(init.headers['User-Agent'],'ruflo-hub-public-metadata-probe');
  }
  assert.equal(result.checkRuns,2);
  assert.equal(result.checksSuccessful,1);
  assert.equal(result.checksNotSuccessful,1);
  assert.equal(result.result,'OBSERVED_ONLY_NOT_MERGE_APPROVAL');
  assert.equal(result.repositoryMutations,false);
});

test('rejects non-exact or non-full SHA before HTTP',async()=>{
  let calls=0;
  const f=async()=>{calls++;return response(fixture());};
  for(const bad of ['main','../pulls/1','a'.repeat(39),'A'.repeat(40)])
    await assert.rejects(()=>inspectPublicProfferaPr(bad,f),/NOT VERIFIED/);
  assert.equal(calls,0);
});

test('stale head aborts before fetching checks',async()=>{
  const {f,requests}=fakeFetch(fixture({head:{sha:'a'.repeat(40)}}));
  await assert.rejects(()=>inspectPublicProfferaPr(sha,f),/head differs/);
  assert.equal(requests.length,1);
});

test('invalid PR identity, merged PR and invalid reported file counts fail closed',async()=>{
  const invalid=[fixture({number:942}),fixture({merged:true}),
    fixture({changed_files:null}),fixture({base:{repo:{full_name:'other/repo'}}})];
  for(const pr of invalid)
    await assert.rejects(()=>inspectPublicProfferaPr(sha,fakeFetch(pr).f),/NOT VERIFIED/);
});

test('missing, truncated, cross-SHA and over-limit check pages fail closed',async()=>{
  for(const bad of [
    checks({total_count:3}), checks({total_count:101}),
    checks({check_runs:[checks().check_runs[0],
      {head_sha:'b'.repeat(40),name:'test',status:'completed',conclusion:'success'}]}),
    checks({check_runs:[]})
  ]) await assert.rejects(()=>inspectPublicProfferaPr(sha,fakeFetch(fixture(),bad).f),/NOT VERIFIED/);
});

test('HTTP failures are sanitized and never retried',async()=>{
  let attempts=0;
  const rejected=async()=>{attempts++;return {ok:false,status:403,json:async()=>({secret:'DO_NOT_PRINT'})};};
  await assert.rejects(()=>inspectPublicProfferaPr(sha,rejected),error=>{
    assert.match(error.message,/NOT VERIFIED: public GitHub returned HTTP 403/);
    assert.doesNotMatch(error.message,/DO_NOT_PRINT/);
    return true;
  });
  assert.equal(attempts,1);
});

test('403 on the second endpoint is exercised through CLI without leaking remote text',()=>{
  const malicious='REMOTE_DO_NOT_PRINT\nFAKE_ERROR_INJECTION';
  const loader=[
    'let calls=0;',
    'globalThis.fetch=async()=>{calls++;'+
      'if(calls===1)return {ok:true,status:200,json:async()=>('+JSON.stringify(fixture())+')};'+
      'if(calls===2)return {ok:false,status:403,json:async()=>({message:'+JSON.stringify(malicious)+'})};'+
      'throw Error("unexpected third network request");};',
    'process.on("exit",()=>{if(calls!==2)process.stderr.write("UNEXPECTED_FETCH_COUNT");});'
  ].join('\n');
  const child=spawnSync(process.execPath,[
    '--import','data:text/javascript,'+encodeURIComponent(loader),
    resolve('scripts/inspect-public-proffera-pr.mjs'),sha
  ],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
  assert.ifError(child.error);
  assert.equal(child.signal,null);
  assert.equal(child.status,1);
  assert.equal(child.stdout,'');
  assert.equal(child.stderr,'NOT VERIFIED: public metadata probe failed\n');
  assert.doesNotMatch(child.stderr,/REMOTE_DO_NOT_PRINT|FAKE_ERROR_INJECTION/);
});
