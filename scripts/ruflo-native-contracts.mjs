import { spawn } from 'node:child_process';
import { existsSync,mkdirSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';

const binary=process.env.RUFLO_BIN;
if(!binary||!existsSync(binary))throw Error('Pinned RuFlo binary is missing');
if(process.env.GITHUB_REPOSITORY!=='ibboabdoli-ai/ruflo-hub'||
 process.env.GITHUB_REF!=='refs/heads/work/ruflo-three-agent-lab-20261018'){
 throw Error('Only the isolated lab branch is authorized');
}
const root=mkdtempSync(join(tmpdir(),'ruflo-native-contracts-'));
const cwd=join(root,'scratch'),home=join(root,'home');
mkdirSync(cwd);mkdirSync(home);
const env={PATH:process.env.PATH,HOME:home,USERPROFILE:home,
 XDG_CONFIG_HOME:join(home,'.config'),XDG_CACHE_HOME:join(home,'.cache'),
 CI:'true',DO_NOT_TRACK:'1',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',
 CODEX_API_KEY:'',GH_TOKEN:'',GITHUB_TOKEN:'',VERCEL_TOKEN:'',
 TURSO_AUTH_TOKEN:'',TURSO_DATABASE_URL:'',BLOB_READ_WRITE_TOKEN:''};
let child,buffer='',nextId=0;const pending=new Map();const methods=[];
function send(method,params={},timeout=25000){
 const id=++nextId;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP '+method+' timed out'));},timeout);
  pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject:e=>{clearTimeout(timer);reject(e)}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
 });
}
try{
 child=spawn(resolve(binary),['mcp','start'],{cwd,env,stdio:['pipe','pipe','pipe']});
 child.stderr.on('data',()=>{});
 child.on('error',()=>{for(const x of pending.values())x.reject(Error('MCP child start failed'));pending.clear()});
 child.on('exit',()=>{for(const x of pending.values())x.reject(Error('MCP child exited early'));pending.clear()});
 child.stdout.on('data',chunk=>{
  buffer+=chunk.toString();
  if(buffer.length>3*1024*1024)throw Error('MCP frame limit exceeded');
  let end;
  while((end=buffer.indexOf('\n'))>=0){
   const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);
   let msg;try{msg=JSON.parse(line)}catch{continue}
   if(msg.id===undefined)continue;
   const p=pending.get(msg.id);if(!p)continue;
   pending.delete(msg.id);
   msg.error?p.reject(Error('MCP JSONRPC failure '+msg.error.code)):p.resolve(msg.result);
  }
 });
 const hello=await send('initialize',{protocolVersion:'2024-11-05',capabilities:{},
  clientInfo:{name:'ruflo-native-contract-lab',version:'1.0.0'}});
 if(!hello?.serverInfo?.name)throw Error('MCP handshake failed');
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const result=await send('tools/list',{});
 const tools=result.tools||[];
 if(!Array.isArray(tools)||tools.length<25)throw Error('RuFlo MCP catalogue is unavailable');
 const wanted=['swarm_init','swarm_status','agent_spawn','agent_list','agent_execute',
  'agent_status','task_orchestrate','task_create','task_assign','task_status',
  'task_list','task_complete','task_update','task_get','task_claim','task_handoff'];
 const sample=tools.filter(t=>wanted.includes(t.name)||/^task_|^coordination_|^claims_/.test(t.name));
 for(const t of sample){
  const schema=t.inputSchema||{};
  const optional=Object.keys(schema.properties||{});
  const desc=String(t.description||'').replace(/\s+/g,' ').slice(0,250);
  const flags=t.annotations||{};
  const entry={name:t.name,required:schema.required||[],fields:optional.slice(0,22),
   desc,readOnly:flags.readOnlyHint??null,destructive:flags.destructiveHint??null};
  methods.push(entry);
 }
 const byName=new Map(methods.map(m=>[m.name,m]));
 console.log('PASS: Pinned RuFlo MCP tool contracts discovered, count='+tools.length);
 console.log('TASK_ORCHESTRATE_PRESENT='+tools.some(x=>x.name==='task_orchestrate'));
 console.log('LIFECYCLE_SCHEMA='+JSON.stringify(wanted.map(n=>byName.get(n)||{name:n,missing:true})));
 console.log('OTHER_TASK_TOOLS='+JSON.stringify(methods.filter(m=>!wanted.includes(m.name)).slice(0,30)));
 console.log('No tools/call were made. No agent was executed; this is schema discovery only.');
}finally{
 for(const p of pending.values())p.reject(Error('shutting down'));pending.clear();
 if(child){child.stdin.end();child.kill('SIGTERM')}
 rmSync(root,{recursive:true,force:true});
}