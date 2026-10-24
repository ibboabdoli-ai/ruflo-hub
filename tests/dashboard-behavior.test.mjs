import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Execute the actual browser controller against a fixed in-memory DOM and fetch responses.
// This covers errors and partial reports instead of only checking source regexes.
const script=readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8');
const SHA='b5b581a9d39c8b3ab642e929b4c720a6cea49a2d';
function element(){
  return {textContent:'',disabled:false,childNodes:[],events:{},
    append(...nodes){this.childNodes.push(...nodes)},
    replaceChildren(...nodes){this.childNodes=[...nodes]},
    addEventListener(type,fn){this.events[type]=fn}};
}
function ok(payload){return {ok:true,json:async()=>payload};}
function unavailable(){return {ok:false,status:403};}
function pr(repo,n){return {number:n,state:'open',draft:false,merged:false,
  head:{sha:SHA},base:{repo:{full_name:repo}},changed_files:40};}
function runs(){
  return {total_count:1,check_runs:[{head_sha:SHA,name:'validation',
    status:'completed',conclusion:'success'}]};
}
async function render(mode){
  const elements=new Map();
  const document={
    getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},
    createElement(){return element()}
  };
  const fetch=async(url,options)=>{
    assert.equal(options.method,'GET');
    assert.equal(options.credentials,'omit');
    if(mode==='none')return unavailable();
    if(url.includes('profiles/proffera.json'))
      return ok({id:'proffera',repository:'ibboabdoli-ai/Proffera',connected:false,
        mode:'read_only',permissions:{write:false,commit:false,push:false,merge:false,deploy:false,manageSecrets:false}});
    if(url.includes('ibboabdoli-ai/Proffera/')&&mode==='partial')return unavailable();
    if(url.includes('/pulls/4'))return ok(pr('ibboabdoli-ai/ruflo-hub',4));
    if(url.includes('/pulls/941'))return ok(pr('ibboabdoli-ai/Proffera',941));
    if(url.includes('/check-runs?'))return ok(runs());
    throw Error('Unrecognized request '+url);
  };
  runInNewContext(script,{document,fetch,AbortSignal,Date,Promise}, {timeout:2500});
  for(let i=0;i<40&&!elements.get('updated')?.textContent.startsWith('آخرین بررسی');i++)
    await new Promise(resolve=>setImmediate(resolve));
  assert.match(elements.get('updated').textContent,/آخرین بررسی/);
  return id=>elements.get(id).textContent;
}
test('HTTP 403 for every request keeps both counters unknown',async()=>{
  const get=await render('none');
  assert.equal(get('success'),'—');
  assert.equal(get('failed'),'—');
  assert.match(get('notice'),/اطلاعات ناقص/);
});
test('one validated report and one 403 explicitly marks the counters partial',async()=>{
  const get=await render('partial');
  assert.equal(get('success'),'1 (ناقص)');
  assert.equal(get('failed'),'0 (ناقص)');
  assert.match(get('notice'),/اطلاعات ناقص/);
});
test('both validated public reports show complete counts',async()=>{
  const get=await render('all');
  assert.equal(get('success'),'2');
  assert.equal(get('failed'),'0');
  assert.match(get('notice'),/موفقیت/);
});
