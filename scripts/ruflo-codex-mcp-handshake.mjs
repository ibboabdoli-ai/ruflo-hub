import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,rmSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const bin=process.env.RUFLO_BIN, codex=process.env.CODEX_BIN;
if(!existsSync(bin||'')||!existsSync(codex||''))throw Error('Pinned binaries are not available');
const root=mkdtempSync(join(tmpdir(),'ruflo-codex-mcp-'));
const cwd=join(root,'scratch'),home=join(root,'home'),codexHome=join(root,'codex');
for(const p of [cwd,home,codexHome])mkdirSync(p,{recursive:true});
const env={...process.env,HOME:home,USERPROFILE:home,CODEX_HOME:codexHome,
 XDG_CONFIG_HOME:join(home,'.config'),XDG_CACHE_HOME:join(home,'.cache'),
 OPENAI_API_KEY:'',CODEX_API_KEY:'',ANTHROPIC_API_KEY:'',
 GH_TOKEN:'',GITHUB_TOKEN:'',TURSO_AUTH_TOKEN:'',
 TURSO_DATABASE_URL:'',BLOB_READ_WRITE_TOKEN:'',VERCEL_TOKEN:''};
let child;
const pending=new Map();
let buffer='',stderr='',id=0;
function request(method,params){
 const thisId=++id;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(thisId);reject(Error('MCP '+method+' timeout'));},75000);
  pending.set(thisId,{resolve:x=>{clearTimeout(timer);resolve(x);},reject:e=>{clearTimeout(timer);reject(e);}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:thisId,method,params})+'\n');
 });
}
try{
 child=spawn(resolve(bin),['mcp','start'],{cwd,env,stdio:['pipe','pipe','pipe']});
 child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-1000)});
 child.on('error',()=>{for(const p of pending.values())p.reject(Error('MCP server spawn error'));pending.clear();});
 child.on('exit',code=>{for(const p of pending.values())p.reject(Error('MCP server exited early: '+code));pending.clear();});
 child.stdout.on('data',part=>{
   buffer+=part.toString();
   if(buffer.length>2*1024*1024)throw Error('MCP stdout frame exceeded limit');
   let cut;
   while((cut=buffer.indexOf('\n'))>=0){
      const line=buffer.slice(0,cut).trim();buffer=buffer.slice(cut+1);
      let value;try{value=JSON.parse(line)}catch{continue}
      if(value?.id===undefined)continue;
      const h=pending.get(value.id);if(!h)continue;
      pending.delete(value.id);
      if(value.error)h.reject(Error('MCP responded with JSONRPC error '+value.error.code));
      else h.resolve(value.result);
   }
 });
 const initialized=await request('initialize',{
  protocolVersion:'2024-11-05',capabilities:{},
  clientInfo:{name:'ruflo-codex-lab',version:'0.1.0'}});
 if(!initialized?.serverInfo?.name||!initialized.protocolVersion)throw Error('Invalid MCP initialize');
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const tools=await request('tools/list',{});
 if(!Array.isArray(tools?.tools)||tools.tools.length===0)throw Error('No MCP tools discoverable');
 const names=tools.tools.map(x=>x.name);
 const show=names.filter(x=>['swarm_status','swarm_init','agent_list'].includes(x));
 console.log('Relevant MCP schemas: '+JSON.stringify(tools.tools.filter(x=>show.includes(x.name)).map(x=>({name:x.name,required:x.inputSchema?.required||[],fields:Object.keys(x.inputSchema?.properties||{})}))));
 for(const name of ['swarm_status','agent_list']){
   if(!names.includes(name)){console.log('MCP diagnostic '+name+': unavailable');continue}
   try{
     const out=await request('tools/call',{name,arguments:{}});
     const preview=(out?.content||[]).map(x=>x.text||'').join(' ').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,380);
     console.log('MCP direct '+name+': isError='+Boolean(out?.isError)+' text='+preview);
   }catch(e){console.log('MCP direct '+name+' threw '+String(e.message).slice(0,220));}
 }
 console.log('PASS: MCP live initialize; server='+initialized.serverInfo.name+' protocol='+initialized.protocolVersion);
 console.log('PASS: MCP tools/list returned '+names.length+' tools');
 console.log('Known coordination names available: '+names.filter(n=>/^(swarm|agent|task|memory)_/.test(n)).slice(0,30).join(', '));
 const add=spawnSync(resolve(codex),['mcp','add','ruflo','--',resolve(bin),'mcp','start'],{cwd,env,encoding:'utf8',timeout:20000});
 if(add.status!==0||add.error)throw Error('Codex CLI MCP registration command failed, exit '+add.status);
 const listed=spawnSync(resolve(codex),['mcp','list'],{cwd,env,encoding:'utf8',timeout:20000});
 if(listed.status!==0||listed.error||!listed.stdout.includes('ruflo'))throw Error('Codex CLI MCP registry missing Ruflo');
 console.log('PASS: Codex CLI registered Ruflo stdio MCP server in disposable CODEX_HOME');
 const facade=resolve(new URL('./ruflo-readonly-facade.mjs',import.meta.url).pathname);
 if(!existsSync(facade))throw Error('Read-only facade script missing');
 const addFacade=spawnSync(resolve(codex),['mcp','add','ruflo_safe','--',process.execPath,facade],{cwd,env,encoding:'utf8',timeout:20000});
 if(addFacade.status!==0||addFacade.error)throw Error('Codex could not register annotated facade');
 const getFacade=spawnSync(resolve(codex),['mcp','get','ruflo_safe','--json'],{cwd,env,encoding:'utf8',timeout:20000});
 if(getFacade.status!==0||getFacade.error)throw Error('Codex could not inspect annotated facade');
 let parsed;try{parsed=JSON.parse(getFacade.stdout)}catch{throw Error('Codex MCP get was not JSON')}
 if(parsed.enabled===false||!JSON.stringify(parsed.transport||parsed).includes(facade)){
   throw Error('Codex MCP facade transport does not match the intended script');
 }
 console.log('PASS: Codex MCP get confirms registered enabled facade launcher in disposable CODEX_HOME');

 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '## Native Codex / RuFlo MCP no-key verification\n\n'+
   '- MCP initialize: PASS.\n- MCP tools/list: '+names.length+' tools.\n'+
   '- Codex MCP registration and list: PASS.\n'+
   '- No OpenAI key was provided; no model inference was tested.\n'+
   '- This is a connection prerequisite, not proof Codex invoked a tool autonomously.\n');
}finally{
 for(const p of pending.values())p.reject(Error('Shutdown'));pending.clear();
 if(child){child.stdin.end();child.kill('SIGTERM');}
 rmSync(root,{recursive:true,force:true});
}