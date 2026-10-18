import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const codex=process.env.CODEX_BIN;
const ruflo=process.env.RUFLO_BIN;
const scriptPath=resolve('scripts/ruflo-readonly-facade.mjs');
if(!codex||!ruflo||![codex,ruflo,scriptPath].every(existsSync))throw Error('Pinned binaries or facade missing');
if(process.env.GITHUB_REPOSITORY!=='ibboabdoli-ai/ruflo-hub'||
   process.env.GITHUB_REF!=='refs/heads/work/ruflo-three-agent-lab-20261018')throw Error('Outside authorized lab branch');
const root=mkdtempSync(join(tmpdir(),'codex-mcp-startup-'));
const home=join(root,'home'),codexHome=join(root,'codex'),cwd=join(root,'workspace');
for(const dir of [home,codexHome,cwd])mkdirSync(dir,{recursive:true});
const env={PATH:process.env.PATH,HOME:home,USERPROFILE:home,CODEX_HOME:codexHome,
  XDG_CONFIG_HOME:join(home,'.config'),XDG_CACHE_HOME:join(home,'.cache'),
  RUFLO_BIN:ruflo,OPENAI_API_KEY:'',CODEX_API_KEY:'',ANTHROPIC_API_KEY:'',
  GH_TOKEN:'',GITHUB_TOKEN:'',VERCEL_TOKEN:'',CI:'true',DO_NOT_TRACK:'1',
  LOG_FORMAT:'json',RUST_LOG:'codex_core=info,rmcp=info,codex_app_server=info'};
let app;
const wait=new Map();
let seq=0,buffer='',errBuf='';
const events=[];
function rpc(method,params={},ms=40000){
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{wait.delete(id);reject(Error(method+' exceeded '+ms+'ms'))},ms);
    wait.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject:e=>{clearTimeout(timer);reject(e)}});
    app.stdin.write(JSON.stringify({id,method,params})+'\n');
  });
}
function summarize(value){
  if(!value)return {type:typeof value};
  const result=value.result||{};
  const sources=[result.data,result.servers,result.items,result.mcpServers];
  const rows=sources.find(Array.isArray)||[];
  return {
    error:value.error?{code:value.error.code,message:String(value.error.message).slice(0,240)}:undefined,
    keys:Object.keys(result),
    rows:rows.map(r=>({
      name:r.name||r.serverName||r.id||null,
      fields:Object.keys(r).slice(0,15),
      toolNames:(Array.isArray(r.tools)?r.tools:
        Array.isArray(r.tools?.tools)?r.tools.tools:[]).map(t=>t.name).slice(0,10),
      toolCount:Array.isArray(r.tools)?r.tools.length:
        Array.isArray(r.tools?.tools)?r.tools.tools.length:null,
      toolShape:Array.isArray(r.tools)?'array':
        (r.tools&&typeof r.tools==='object'?'object':typeof r.tools),
      status:r.status?.state||r.status||r.startupStatus||null,
      error:r.error?String(r.error).slice(0,250):null
    })).slice(0,10)
  };
}
try{
  const reg=spawnSync(resolve(codex),['mcp','add','ruflo_safe','--',process.execPath,scriptPath],{
    cwd,env,encoding:'utf8',timeout:20000});
  if(reg.status!==0||reg.error)throw Error('Could not register safe facade');
  const conf=spawnSync(resolve(codex),['mcp','get','ruflo_safe','--json'],{
    cwd,env,encoding:'utf8',timeout:20000});
  if(conf.status!==0||conf.error||!conf.stdout.includes('ruflo-readonly-facade.mjs'))
    throw Error('Codex local MCP config mismatch');
  console.log('PASS: Codex config points to strict facade');

  app=spawn(resolve(codex),['app-server','--stdio'],{cwd,env,stdio:['pipe','pipe','pipe']});
  app.on('error',()=>{for(const p of wait.values())p.reject(Error('app-server launch failed'));wait.clear()});
  app.on('exit',code=>{for(const p of wait.values())p.reject(Error('app-server exited '+code));wait.clear()});
  app.stderr.on('data',c=>{errBuf=(errBuf+c.toString()).slice(-16000)});
  app.stdout.on('data',c=>{
    buffer+=c.toString();
    if(buffer.length>2*1024*1024)throw Error('Unexpected app-server output volume');
    let end;
    while((end=buffer.indexOf('\n'))>=0){
      const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);
      let item;try{item=JSON.parse(line)}catch{continue}
      if(item.id!==undefined){
        const w=wait.get(item.id);
        if(!w)continue;wait.delete(item.id);w.resolve(item);
      }else if(typeof item.method==='string'&&
        /mcpServer|configWarning|warning/.test(item.method)){
        const p=item.params||{};
        events.push({method:item.method,name:p.name||p.server||null,
          status:p.status||null,error:p.error?String(p.error).slice(0,240):null});
      }
    }
  });

  const hello=await rpc('initialize',{
    clientInfo:{name:'ruflo_codex_zero_cost_probe',version:'0.1.0'},
    capabilities:{experimentalApi:false}
  },25000);
  if(hello.error)throw Error('Codex app-server initialize rejected '+JSON.stringify(summarize(hello)));
  app.stdin.write(JSON.stringify({method:'initialized'})+'\n');
  console.log('PASS: Codex app-server initial handshake');

  const global=await rpc('mcpServerStatus/list',{serverName:'ruflo_safe',detail:'toolsAndAuthOnly'},40000);
  console.log('GLOBAL_MCP: '+JSON.stringify(summarize(global)));
  const start=await rpc('thread/start',{
    cwd,ephemeral:true,approvalPolicy:'never',sandbox:'readOnly'
  },40000);
  const tid=start.result?.thread?.id;
  console.log('THREAD_START: '+JSON.stringify({
    hasThread:Boolean(tid),error:start.error?.message?.slice(0,300)||null,
    errorCode:start.error?.code||null
  }));
  if(tid){
    const scoped=await rpc('mcpServerStatus/list',{
      threadId:tid,serverName:'ruflo_safe',detail:'toolsAndAuthOnly'
    },50000);
    console.log('THREAD_MCP: '+JSON.stringify(summarize(scoped)));
    // App-server startup events alone can indicate readiness even when a tool catalog is blank.
    const sc=summarize(scoped);
    const ready=sc.rows.some(r=>r.toolNames.includes('ruflo_read_agent_count'));
    console.log(ready?'PASS: Codex thread discovers annotated facade tool without inference.':
      'BLOCKED: Codex thread did not report the annotated facade tool.');
    if(!ready)process.exitCode=2;
  }else process.exitCode=2;
  console.log('MCP_STARTUP_EVENTS: '+JSON.stringify(events.slice(-12)));
  // Log only counts and recognized diagnostic categories, never raw content.
  console.log('APP_LOG_SUMMARY: '+JSON.stringify({
    lines:errBuf.split('\n').filter(Boolean).length,
    mentionsFacade:errBuf.includes('ruflo_safe'),
    mentionsFailure:/failed to start|startup failed|handshaking.*failed|MCP.*timed out/i.test(errBuf)
  }));
}finally{
  for(const p of wait.values())p.reject(Error('app-server shutdown'));wait.clear();
  if(app){app.stdin.end();app.kill('SIGTERM')}
  rmSync(root,{recursive:true,force:true});
  console.log('CONFIRMED: no model turn/start or provider generation was requested.');
}
