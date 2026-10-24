import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8');
const HUB='c784e0dfd9ba355e9d9420374691860904d92e7e';
const PRO='a9a61b225cd8343ac0c66af1c38c96d978f443f5';
const PR941='9ac8b38df37cdcb8a917ea4c10f2cc9f79a750ca';

function element(){return {textContent:'',className:'',disabled:false,childNodes:[],events:{},
  append(...items){this.childNodes.push(...items)},
  replaceChildren(...items){this.childNodes=[...items]},
  addEventListener(type,fn){this.events[type]=fn}
}}
const ok=payload=>({ok:true,json:async()=>payload});
const unavailable=()=>({ok:false,status:403});
function runItems(sha,n=1){const items=Array.from({length:n},(_,i)=>({head_sha:sha,name:'validation '+i,status:'completed',conclusion:'success'}));return{total_count:n,check_runs:items}}
function pr(repo,n,title='Latest PR'){return{number:n,state:'open',draft:false,head:{sha:n===941?PR941:PRO},base:{repo:{full_name:repo}},title}}
async function render(mode){
  const elements=new Map(),requests=[];
  const doc={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement(){return element()}};
  const fetch=async(url,options)=>{
    requests.push(url);
    assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');
    assert.equal(options.redirect,'error');assert.ok(url.startsWith('https://api.github.com/repos/')||url.startsWith('https://raw.githubusercontent.com/ibboabdoli-ai/ruflo-hub/main/profiles/'));
    if(mode==='none')return unavailable();
    const isPro=url.includes('/ibboabdoli-ai/Proffera/');
    if(mode==='partial'&&isPro)return unavailable();
    if(url.endsWith('profiles/proffera.json'))return ok({id:'proffera',repository:'ibboabdoli-ai/Proffera',mode:'read_only',connected:false,permissions:{write:false,commit:false,push:false,merge:false,deploy:false,manageSecrets:false}});
    if(url.endsWith('/branches/main'))return ok({name:'main',commit:{sha:isPro?PRO:HUB}});
    if(url.includes('/pulls?'))return ok(isPro?[pr('ibboabdoli-ai/Proffera',941,mode==='xss'?'<img src=x onerror=alert(1)>':'Supervisor repair'),pr('ibboabdoli-ai/Proffera',949,'Site security')]:[]);
    if(url.endsWith('/pulls/941'))return ok(pr('ibboabdoli-ai/Proffera',941,'Supervisor repair'));
    if(url.includes('/check-runs?')){
      if(url.includes('/'+PR941+'/'))return ok({total_count:1,check_runs:[{head_sha:PR941,name:'Governance',status:'completed',conclusion:'success'}]});
      if(isPro&&mode==='wrong-sha')return ok(runItems(HUB));
      if(isPro&&mode==='sampled')return ok({total_count:2145,check_runs:Array.from({length:20},(_,i)=>({head_sha:PRO,name:'Supervisor CI '+i,status:'completed',conclusion:i%2?'skipped':'success'}))});
      return ok(runItems(isPro?PRO:HUB));
    }
    throw Error('Unknown mocked URL '+url);
  };
  runInNewContext(script,{document:doc,fetch,AbortSignal,Promise,Date},{timeout:2000});
  for(let i=0;i<120&&!elements.get('updated')?.textContent.startsWith('آخرین تلاش');i++)await new Promise(r=>setImmediate(r));
  assert.match(elements.get('updated').textContent,/آخرین تلاش/);
  return {get:id=>elements.get(id)?.textContent,nodes:id=>elements.get(id)?.childNodes,requests};
}
test('all 403s leave CI and PR counts unknown',async()=>{
  const v=await render('none');
  assert.equal(v.get('success'),'—');assert.equal(v.get('failed'),'—');assert.equal(v.get('prs-total'),'—');
  assert.match(v.get('notice'),/اطلاعات کامل نیست/);
});
test('one main report and other repo HTTP 403 mark CI counts partial',async()=>{
  const v=await render('partial');
  assert.equal(v.get('success'),'1 (ناقص)');assert.equal(v.get('failed'),'0 (ناقص)');
  assert.equal(v.get('proffera-state'),'نامشخص');assert.match(v.get('notice'),/دریافت تأیید نشد/);
});
test('both main branches and latest open PRs are grounded by GitHub SHA and safe links',async()=>{
  const v=await render('all');
  assert.equal(v.get('success'),'2');assert.equal(v.get('failed'),'0');
  assert.equal(v.get('hub-main'),HUB.slice(0,10));assert.equal(v.get('proffera-main'),PRO.slice(0,10));
  assert.equal(v.get('prs-total'),'2');assert.equal(v.get('connection'),'قطع');
  assert.ok(v.requests.some(u=>u.endsWith('/branches/main')));
  const links=v.nodes('proffera-pr-list');assert.equal(links.length,2);
  assert.equal(links[0].childNodes[0].href,'https://github.com/ibboabdoli-ai/Proffera/pull/941');
  assert.match(v.get('supervisor-state'),/نه تأیید فعالیت لحظه‌ای Supervisor/);
});
test('mismatched check SHA is rejected, with no confident Proffera main statistic',async()=>{
  const v=await render('wrong-sha');
  assert.equal(v.get('success'),'1 (ناقص)');assert.equal(v.get('proffera-state'),'نامشخص');
  assert.match(v.get('notice'),/Proffera main\/CI/);
});
test('2145 main checks are sampled, never presented as a complete CI report',async()=>{
  const v=await render('sampled');
  assert.equal(v.get('success'),'11 (ناقص)');assert.equal(v.get('failed'),'0 (ناقص)');
  assert.match(v.get('proffera-checks'),/۲۰|20/);assert.match(v.get('proffera-checks'),/2145/);
  assert.match(v.get('notice'),/فقط به‌صورت نمونه/);
});
test('untrusted PR title is shown as inert text, never parsed as HTML',async()=>{
  const v=await render('xss');
  const anchor=v.nodes('proffera-pr-list')[0].childNodes[0];
  assert.equal(anchor.textContent,'#941 · <img src=x onerror=alert(1)>');
  assert.equal(v.nodes('proffera-pr-list').length,2);
});
