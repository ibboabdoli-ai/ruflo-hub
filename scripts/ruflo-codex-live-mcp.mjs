import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,rmSync,existsSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

// One model session, allowed only after zero-cost app-server confirmed a connected
// MCP thread with exactly one read-only tool on this exact pinned source.
const safeBranch='refs/heads/work/ruflo-three-agent-lab-20261018';
if(process.env.GITHUB_REPOSITORY!=='ibboabdoli-ai/ruflo-hub'||
  process.env.GITHUB_REF!==safeBranch)throw Error('Refusing outside dedicated RuFlo sandbox branch');
const key=process.env.OPENAI_API_KEY;
const codex=process.env.CODEX_BIN,ruflo=process.env.RUFLO_BIN;
const facade=resolve('scripts/ruflo-readonly-facade.mjs');
if(!key||key.length<20||!existsSync(codex||'')||!existsSync(ruflo||'')||!existsSync(facade))
 throw Error('API key or pinned binaries missing');
const root=mkdtempSync(join(tmpdir(),'ruflo-codex-live-'));
const cwd=join(root,'scratch'),home=join(root,'home'),cHome=join(root,'codex');
[cwd,home,cHome].forEach(x=>mkdirSync(x,{recursive:true}));
const base={...process.env,HOME:home,USERPROFILE:home,
  CODEX_HOME:cHome,XDG_CONFIG_HOME:join(home,'.config'),XDG_CACHE_HOME:join(home,'.cache'),
  GH_TOKEN:'',GITHUB_TOKEN:'',VERCEL_TOKEN:'',
  BLOB_READ_WRITE_TOKEN:'',TURSO_AUTH_TOKEN:'',TURSO_DATABASE_URL:'',
  ANTHROPIC_API_KEY:'',OPENROUTER_API_KEY:'',OPENAI_API_KEY:''};
function safeRun(args,env,timeout){
 const p=spawnSync(resolve(codex),args,{cwd,env,encoding:'utf8',
  maxBuffer:12*1024*1024,timeout});
 return p;
}
try{
 const reg=safeRun(['mcp','add','ruflo_safe','--env','RUFLO_BIN='+ruflo,'--',process.execPath,facade],
    {...base,CODEX_API_KEY:''},20000);
 if(reg.error||reg.status!==0)throw Error('Could not register scrubbed Ruflo MCP in isolated Codex');
 const list=safeRun(['mcp','list'],{...base,CODEX_API_KEY:''},20000);
 if(list.status!==0||!list.stdout.includes('ruflo_safe'))throw Error('Codex MCP config absent');

 // Exactly one Codex session, with an independent timeout, no file writes.
 // The code intentionally does not dump Codex stdout or stderr to public logs.
 const prompt=[
  'This is a completely synthetic security-lab experiment.',
  'Find the sole connected ruflo_safe MCP tool named ruflo_read_agent_count and CALL IT exactly once with empty arguments. Use the tool result, not your memory.',
  'Do not use shell, internet browsing, or file tools.',
  'Do not start a real task or spawn background agents.',
  'After the tool result, answer one sentence beginning STATUS: and report the observed count. Do not guess.',
  'If the tool fails, answer STATUS: UNAVAILABLE, and do not fabricate the count.'
 ].join(' ');
 const args=['exec','--json','--sandbox','read-only','--skip-git-repo-check',
   '--ephemeral','--model','gpt-5.6-luna',
   '-c','model_reasoning_effort="low"',
   '-c','approval_policy="never"',
   prompt];
 const before=Date.now();
 const result=safeRun(args,{...base,CODEX_API_KEY:key},105000);
 const elapsedMs=Date.now()-before;
 const events=(result.stdout||'').split('\n').map(line=>{
  try{return JSON.parse(line)}catch{return null}
 }).filter(Boolean);
 const calls=events.filter(e=>
  /mcp_tool_call/.test(String(e.item?.type||e.type)) ||
  (String(e.type).includes('tool_call')&&String(e.item?.server||'').includes('ruflo')));
 const observed=calls.map(e=>({type:e.item?.type||e.type,
  server:e.item?.server||e.item?.server_name||null,
  tool:e.item?.tool||e.item?.name||e.item?.tool_name||null,
  state:e.item?.status||null}));
 const toolHit=observed.some(x=>String(x.tool||'').includes('ruflo_read_agent_count') &&
   (String(x.server||'').includes('ruflo_safe')||x.server===null) && x.state==='completed');
 const summaryEvent=events.filter(x=>x.type==='turn.completed').at(-1);
 const usage=summaryEvent?.usage||summaryEvent?.turn?.usage||null;
 console.log('Codex run exposes only annotated read-only ruflo_read_agent_count via strict local facade.');
 console.log('Codex: exit='+result.status+' elapsedMs='+elapsedMs+
   ' events='+events.length+' mcpToolEvents='+calls.length);
 console.log('Observed Ruflo MCP tool events: '+JSON.stringify(observed.slice(0,12)));
 console.log('Codex event types: '+JSON.stringify(events.map(e=>({event:e.type,item:e.item?.type||null}))));
 const messages=events.filter(e=>e.item?.type==='agent_message').map(e=>String(e.item?.text||'')).filter(Boolean);
 const excerpt=messages.at(-1)?.replaceAll(key,'[redacted]').slice(0,600)||'none';
 console.log('Codex sanitized final message: '+excerpt);

 console.log('MCP item error diagnostics: '+JSON.stringify(calls.filter(e=>e.item?.status==='failed').slice(0,2).map(e=>({
  message:String(e.item?.error?.message||e.item?.error||e.item?.result||'not provided')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g,'[redacted]').slice(0,300)
 }))));
 if(usage)console.log('Codex provider-reported usage: '+JSON.stringify(usage).slice(0,700));
 if(result.error)console.log('Codex process termination: '+String(result.error.code||'unknown'));
 const ok=result.status===0 && toolHit;
 console.log(ok?'PASS: Codex completed annotated read-only facade -> Ruflo agent_list via native MCP.':
   'INCOMPLETE: no completed native Codex->RuFlo read-only facade invocation.');
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '## Codex -> RuFlo native MCP tool-use test\n\n'+
   '- Model: gpt-5.6-luna, reasoning low; exactly one bounded Codex session.\n'+
   '- Runtime: '+elapsedMs+' milliseconds; exit '+result.status+'.\n'+
   '- Observed MCP calls: '+JSON.stringify(observed.slice(0,6))+'\n'+
   '- Proven completed annotated facade call: '+(ok?'YES':'NO')+'.\n'+
   '- Codex usage: '+JSON.stringify(usage||'not reported')+'.\n'+
   '- Sandbox read-only, no repository changes, no Production connections.\n');
 if(!ok)process.exitCode=1;
}finally{rmSync(root,{recursive:true,force:true});}