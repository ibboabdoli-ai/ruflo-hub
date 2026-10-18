import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const ruflo=process.env.RUFLO_BIN;
if(!ruflo||!existsSync(ruflo))throw Error('Pinned RuFlo binary unavailable');
if(process.env.GITHUB_REPOSITORY!=='ibboabdoli-ai/ruflo-hub'||
 process.env.GITHUB_REF!=='refs/heads/work/ruflo-three-agent-lab-20261018'){
 throw Error('Must run in the dedicated disconnected lab branch');
}
const root=mkdtempSync(join(tmpdir(),'ruflo-native-offline-cycle-'));
const cwd=join(root,'scratch'),home=join(root,'home');
mkdirSync(cwd);mkdirSync(home);
const env={PATH:process.env.PATH,HOME:home,USERPROFILE:home,
 XDG_CONFIG_HOME:join(home,'.config'),XDG_CACHE_HOME:join(home,'.cache'),
 CI:'true',DO_NOT_TRACK:'1',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',
 OPENROUTER_API_KEY:'',OLLAMA_API_KEY:'',CODEX_API_KEY:'',
 GH_TOKEN:'',GITHUB_TOKEN:'',VERCEL_TOKEN:'',
 TURSO_AUTH_TOKEN:'',TURSO_DATABASE_URL:'',BLOB_READ_WRITE_TOKEN:''};
let child,buffer='',seq=0;const pending=new Map();
function rpc(method,params={},timeout=18000){
 const id=++seq;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'))},timeout);
  pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
 });
}
async function tool(name,args={},timeout=20000){
 const result=await rpc('tools/call',{name,arguments:args},timeout);
 const raw=(result.content||[]).filter(x=>x.type==='text').map(x=>x.text||'').join('\n');
 let data;
 try{data=JSON.parse(raw)}catch{data={message:raw.slice(0,800)}}
 return {isError:Boolean(result.isError),data};
}
function idOf(data,prefix){
 for(const candidate of [data?.agentId,data?.swarmId,data?.taskId,data?.id,
  data?.agent?.id,data?.task?.id,data?.swarm?.id]){
  if(typeof candidate==='string'&&candidate.length>0)return candidate;
 }
 throw Error(prefix+' did not return an identifier; keys='+Object.keys(data||{}).join(','));
}
function summary(name,r){
 const d=r.data||{};
 const v={name,isError:r.isError,keys:Object.keys(d).slice(0,18)};
 if(d.status!==undefined)v.status=d.status;
 if(d.success!==undefined)v.success=d.success;
 if(d.message!==undefined)v.message=String(d.message).slice(0,180);
 if(d.error!==undefined)v.error=String(d.error).slice(0,220);
 for(const key of ['taskId','agentId','swarmId','total','taskCount','totalAgents']){
  if(d[key]!==undefined)v[key]=d[key]
 }
 return v;
}
let passed=0;
try{
 child=spawn(resolve(ruflo),['mcp','start'],{cwd,env,stdio:['pipe','pipe','pipe']});
 child.stderr.on('data',()=>{});
 child.on('error',()=>{for(const p of pending.values())p.reject(Error('RuFlo MCP server failed to start'));pending.clear()});
 child.on('exit',()=>{for(const p of pending.values())p.reject(Error('RuFlo MCP server exited early'));pending.clear()});
 child.stdout.on('data',data=>{
  buffer+=data.toString();
  if(buffer.length>3*1024*1024)throw Error('MCP frame too large');
  let end;
  while((end=buffer.indexOf('\n'))>=0){
   const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);
   let item;try{item=JSON.parse(line)}catch{continue}
   if(item.id===undefined)continue;
   const w=pending.get(item.id);if(!w)continue;
   pending.delete(item.id);
   item.error?w.reject(Error('MCP protocol error '+item.error.code)):w.resolve(item.result);
  }
 });
 const init=await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},
  clientInfo:{name:'offline-ruflo-coordination-probe',version:'1.0.0'}});
 if(!init.serverInfo?.name)throw Error('MCP initialize failed');
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const tools=(await rpc('tools/list')).tools||[];
 const required=['swarm_init','swarm_status','agent_spawn','agent_list','agent_status',
  'agent_execute','task_create','task_assign','task_list','task_status','task_complete',
  'coordination_orchestrate'];
 if(!required.every(n=>tools.some(t=>t.name===n)))throw Error('Required native MCP tools absent');
 console.log('PASS: core coordination interfaces available with no provider credentials');
 passed++;
 const swarm=await tool('swarm_init',{topology:'hierarchical',maxAgents:3,strategy:'specialized'});
 console.log('SWARM_INIT '+JSON.stringify(summary('swarm_init',swarm)));
 if(swarm.isError||swarm.data?.success===false)throw Error('Native swarm initialization failed');
 const swarmId=idOf(swarm.data,'swarm');
 passed++;
 const roles=['researcher','coder','tester'];
 const ids=[];
 for(const role of roles){
  const result=await tool('agent_spawn',{agentType:role,swarmId,
   task:'Synthetic unit-test fixture only; no source, tools, or real accounts.'});
  console.log('AGENT_SPAWN '+JSON.stringify({...summary('agent_spawn',result),role}));
  if(result.isError||result.data?.success===false)throw Error('Agent registration failed: '+role);
  ids.push(idOf(result.data,'agent '+role));
 }
 passed++;
 const list=await tool('agent_list',{});
 console.log('AGENT_LIST '+JSON.stringify(summary('agent_list',list)));
 if(list.isError)throw Error('Agent listing failed');
 const count=list.data?.total??list.data?.totalAgents??list.data?.agents?.length;
 if(count!==3)throw Error('Expected three registered agents, observed '+count);
 passed++;
 const steps=[
  ['review','Find the empty-array issue in a synthetic average function'],
  ['fix','Propose a patch to handle the empty-array case; do not edit code'],
  ['verify','Specify tests for empty and two-number arrays']
 ];
 const tasks=[];
 for(let i=0;i<steps.length;i++){
  const created=await tool('task_create',{type:steps[i][0],description:steps[i][1],
   priority:'low',tags:['synthetic','read-only']});
  console.log('TASK_CREATE '+JSON.stringify({...summary('task_create',created),role:roles[i]}));
  if(created.isError||created.data?.success===false)throw Error('Task creation failed at '+i);
  tasks.push(idOf(created.data,'task '+i));
 }
 passed++;
 for(let i=0;i<3;i++){
  const assigned=await tool('task_assign',{taskId:tasks[i],agentIds:[ids[i]]});
  console.log('TASK_ASSIGN '+JSON.stringify({...summary('task_assign',assigned),role:roles[i]}));
  if(assigned.isError||assigned.data?.success===false)throw Error('Task assignment failed at '+i);
 }
 passed++;
 for(let i=0;i<3;i++){
  const st=await tool('task_status',{taskId:tasks[i]});
  console.log('TASK_STATUS '+JSON.stringify({...summary('task_status',st),role:roles[i]}));
  if(st.isError)throw Error('Task status failed at '+i);
 }
 passed++;
 // Coordination orchestration is probed with NO provider keys, in a scratch cwd.
 // An acknowledged orchestration record must NOT be described as model execution.
 const orchestration=await tool('coordination_orchestrate',{task:
  'SYNTHETIC DRY RUN: review/patch/verify an average([]) edge case. Do not use network or files.',
  agents:ids,strategy:'sequential',timeout:3000},15000);
 console.log('COORDINATION_ORCHESTRATE '+JSON.stringify(summary('coordination_orchestrate',orchestration)));
 passed++;
 // Explicit attempt to run one registered agent MUST NOT succeed without a real provider.
 // This tells us whether the advertised native worker can use the current OPENAI key.
 const attempt=await tool('agent_execute',{agentId:ids[0],
   prompt:'Synthetic math only: state what average([]) should return.',maxTokens:32},18000);
 const output=JSON.stringify(attempt.data||{}).toLowerCase();
 const denied=attempt.isError||attempt.data?.success===false||
  /no llm provider|api.key|anthropic|openrouter|ollama|not configured|not set/.test(output);
 console.log('AGENT_EXECUTE_NO_PROVIDER '+JSON.stringify({isError:attempt.isError,
   success:attempt.data?.success??null,blocked:denied,
   code:attempt.data?.code??null,
   message:String(attempt.data?.error||attempt.data?.message||'').slice(0,280)}));
 if(!denied)throw Error('Unexpected agent_execute success without credentials; do not claim isolation');
 passed++;
 for(let i=0;i<3;i++){
  const completed=await tool('task_complete',{taskId:tasks[i],
   result:'Synthetic offline completion marker for '+roles[i]+'. No model call made.'});
  console.log('TASK_COMPLETE '+JSON.stringify({...summary('task_complete',completed),role:roles[i]}));
  if(completed.isError||completed.data?.success===false)throw Error('Task completion rejected at '+i);
  const checked=await tool('task_status',{taskId:tasks[i]});
  console.log('TASK_VERIFY '+JSON.stringify({...summary('task_status',checked),role:roles[i]}));
  if(checked.isError||checked.data?.status!=='completed')
    throw Error('Task completion state did not persist at '+i);
 }
 passed++;
 const tasksNow=await tool('task_list',{limit:20});
 console.log('TASK_LIST '+JSON.stringify({...summary('task_list',tasksNow),
  taskCount:tasksNow.data?.tasks?.length??null}));
 if(tasksNow.isError)throw Error('Task listing failed');
 passed++;
 console.log('PASS: validated native coordination/registry/task lifecycle in ephemeral sandbox; checks='+passed);
 console.log('NOT PROVEN: independent LLM-backed agents, actual agent task execution, automatic assignment or model-to-model handoffs.');
}finally{
 for(const p of pending.values())p.reject(Error('cleanup'));pending.clear();
 if(child){child.stdin.end();child.kill('SIGTERM')}
 rmSync(root,{recursive:true,force:true});
 console.log('CONFIRMED: no provider keys, no GitHub credentials, no real repositories, no Production.');
}