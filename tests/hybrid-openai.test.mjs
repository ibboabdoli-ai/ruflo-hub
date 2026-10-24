import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundedOpenAIClient, HYBRID_ROLES, HYBRID_LIMITS} from '../lib/hybrid-openai.mjs';

const key = 'fixture-only-not-a-real-api-key-000000';
const result = (text, status = 'completed') => ({
  ok: true, status: 200,
  async json() {
    return {status, output:[{content:[{type:'output_text',text}]}],
      usage:{input_tokens:25,output_tokens:7}};
  }
});

test('one request per role in order, bounded payload, secret only in bearer header', async () => {
  const observed = [];
  const client = createBoundedOpenAIClient({
    apiKey:key,
    fetchImpl:async (url, request) => {
      observed.push({url,request});
      return result(['FINDING: empty list','PATCH: guard empty list','CHECK: [] and [2,4]'][observed.length-1]);
    }
  });
  for(let i=0;i<HYBRID_ROLES.length;i++){
    const out=await client.generate(HYBRID_ROLES[i], 'synthetic code only', ['FINDING:','PATCH:','CHECK:'][i]);
    assert.equal(out.prefixMatch,true);
    assert.deepEqual(out.usage,{inputTokens:25,outputTokens:7});
  }
  assert.equal(client.attempts(),3);
  assert.equal(observed.length,3);
  for(const {url,request} of observed){
    assert.equal(url,'https://api.openai.com/v1/responses');
    assert.equal(request.headers.Authorization,'Bearer '+key);
    assert.equal(request.redirect,'error');
    const body=JSON.parse(request.body);
    assert.deepEqual({model:body.model,store:body.store,maxOutput:body.max_output_tokens},
      {model:'gpt-4.1-mini',store:false,maxOutput:HYBRID_LIMITS.maxOutputTokens});
    assert.ok(!request.body.includes(key));
  }
  await assert.rejects(()=>client.generate('researcher','fourth call','FINDING:'),/budget exhausted/);
  assert.equal(observed.length,3);
});

test('wrong role or excessive prompt fails before any provider request', async () => {
  let calls=0;
  const client=createBoundedOpenAIClient({apiKey:key,fetchImpl:async()=>{
    calls++;return result('FINDING: ok');
  }});
  await assert.rejects(()=>client.generate('tester','valid','CHECK:'),/role order/);
  await assert.rejects(()=>client.generate('researcher','a'.repeat(1501),'FINDING:'),/bounds/);
  await assert.rejects(()=>client.generate('researcher','valid','WRONG:'),/prefix/);
  assert.equal(client.attempts(),0);assert.equal(calls,0);
});

test('API failures consume the single allowed attempt and never auto-retry', async () => {
  let requests=0;
  const client=createBoundedOpenAIClient({apiKey:key,fetchImpl:async()=> {
    requests++;return {ok:false,status:429,async text(){throw new Error('secret body')}};
  }});
  await assert.rejects(()=>client.generate('researcher','fixture','FINDING:'),/HTTP 429/);
  assert.equal(requests,1);assert.equal(client.attempts(),1);
  await assert.rejects(()=>client.generate('researcher','fixture','FINDING:'),/role order/);
  assert.equal(requests,1);
});

test('incomplete and oversized model results are rejected', async () => {
  const incomplete=createBoundedOpenAIClient({apiKey:key,fetchImpl:async()=>result('FINDING: partial','incomplete')});
  await assert.rejects(()=>incomplete.generate('researcher','fixture','FINDING:'),/incomplete/);
  const oversized=createBoundedOpenAIClient({apiKey:key,fetchImpl:async()=>result('X'.repeat(1501))});
  await assert.rejects(()=>oversized.generate('researcher','fixture','FINDING:'),/bounds/);
});

test('unexpected model format fails closed', async () => {
  const client=createBoundedOpenAIClient({apiKey:key,fetchImpl:async()=>result('Fix the empty-list case')});
  await assert.rejects(()=>client.generate('researcher','fixture','FINDING:'),/required role prefix/);
  assert.equal(client.attempts(),1);
});

test('mismatched response prefix for an otherwise valid role is rejected before billing', async () => {
  let calls=0;
  const client=createBoundedOpenAIClient({apiKey:key,fetchImpl:async()=>{calls++;return result('PATCH: unexpected')}});
  await assert.rejects(()=>client.generate('researcher','fixture','PATCH:'),/role response prefix/);
  assert.equal(client.attempts(),0);
  assert.equal(calls,0);
});

test('invalid credentials are rejected at construction', () => {
  assert.throws(()=>createBoundedOpenAIClient({apiKey:''}),/credential/);
});
