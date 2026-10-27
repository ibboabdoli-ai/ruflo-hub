// Offline fixture benchmark: deterministic direct repair versus a real RuFlo
// task-registration / assignment / persistence loop. NOT a Codex/model benchmark.
import {spawn} from 'node:child_process';
import {appendFileSync,existsSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {benchmarkFixture} from './repair.mjs';

const arm=process.argv[2];
if(!['direct','ruflo'].includes(arm))throw Error('Choose direct or ruflo');
if(process.env.CI==='true'&&(process.env.GITHUB_REPOSITORY!=='ibboabdoli-ai/ruflo-hub'
  ||process.env.GITHUB_REF!=='refs/heads/work/ruflo-offline-benchmark-20261025')){
  throw Error('Benchmark CI is restricted to isolated RuFlo Hub lab branch');
}
const duration=start=>Number((Number(process.hrtime.bigint()-start)/1e6).toFixed(3));
const finish=(result)=>{
  console.log('BENCH_RESULT '+JSON.stringify(result));
  if(process.env.GITHUB_STEP_SUMMARY){
    const b=result;
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,[
      '## Offline RuFlo benchmark ('+arm+')','',
      '| Measurement | Observation |','|---|---|',
      '| Fixture defects found | '+b.baselineFailures+' |',
      '| Static reference tests passed | '+b.passesAfter+'/'+b.fixtureCases+' |',
      '| Static patch + tests | '+b.repairAndTestMs+' ms |',
      '| End-to-end benchmark arm | '+b.totalMs+' ms |',
      '| Real RuFlo native task completions | '+b.nativeTasksCompleted+' |',
      '| Model/API calls | 0 |','',
      '**Not Codex vs RuFlo speed/quality evidence.** Both paths apply one identical pre-reviewed reference patch; the RuFlo arm only tests real no-key task bookkeeping and overhead. No autonomous model inference, no code generation.'
    ].join('\n')+'\n');
  }
};
if(arm==='direct'){
  const start=process.hrtime.bigint();
  const m=await benchmarkFixture();
  finish({arm, ...m,totalMs:duration(start),nativeTasksCompleted:0,
    comparisonScope:'static fixture path, without any model'});
}else{
  const bin=process.env.RUFLO_BIN;
  if(!bin||!existsSync(bin))throw Error('Reviewed pinned RuFlo CLI missing');
  const root=mkdtempSync(join(tmpdir(),'ruflo-offline-bench-'));
  const cwd=join(root,'scratch'),home=join(root,'home');
  mkdirSync(cwd);mkdirSync(home);
  const env={PATH:process.env.PATH,HOME:home,USERPROFILE:home,
    XDG_CONFIG_HOME:join(home,'.config'),XDG_CACHE_HOME:join(home,'.cache'),
    CI:'true',DO_NOT_TRACK:'1',NO_COLOR:'1',OPENAI_API_KEY:'',
    ANTHROPIC_API_KEY:'',OPENROUTER_API_KEY:'',OLLAMA_API_KEY:'',
    GH_TOKEN:'',GITHUB_TOKEN:'',VERCEL_TOKEN:'',CODEX_API_KEY:'',
    TURSO_AUTH_TOKEN:'',BLOB_READ_WRITE_TOKEN:''};
  const started=process.hrtime.bigint();
  let child,buffer='',seq=0;
  const pending=new Map();
  function rejectAll(message){
    for(const task of pending.values())task.reject(Error(message));
    pending.clear();
  }
  function rpc(method,params={},ms=18000){
    if(!child||child.exitCode!==null)throw Error('RuFlo MCP child not running');
    const id=++seq;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'))},ms);
      pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});
      child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    });
  }
  async function invoke(name,args,ms=18000){
    const r=await rpc('tools/call',{name,arguments:args},ms);
    if(r?.isError)throw Error(name+' returned MCP error');
    const text=(r?.content||[]).filter(x=>x.type==='text').map(x=>x.text||'').join('\n');
    let data;try{data=JSON.parse(text)}catch{throw Error(name+' did not return machine-readable data')}
    if(data?.success===false)throw Error(name+' returned success=false');
    return data;
  }
  function idOf(data,kind){
    for(const v of [data?.swarmId,data?.agentId,data?.taskId,data?.id,
      data?.swarm?.id,data?.agent?.id,data?.task?.id]){
      if(typeof v==='string'&&v.length>0&&v.length<=150)return v;
    }
    throw Error(kind+' missing identifier');
  }
  try{
    child=spawn(resolve(bin),['mcp','start'],{cwd,env,stdio:['pipe','pipe','pipe']});
    child.stderr.on('data',()=>{});
    child.on('error',()=>rejectAll('RuFlo CLI failed to launch'));
    child.on('exit',()=>rejectAll('RuFlo CLI exited'));
    child.stdout.on('data',chunk=>{
      buffer+=chunk.toString('utf8');
      if(buffer.length>3*1024*1024){rejectAll('MCP output exceeded size limit');child.kill();return}
      let end;
      while((end=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);
        let msg;try{msg=JSON.parse(line)}catch{continue}
        if(msg.id===undefined)continue;
        const job=pending.get(msg.id);if(!job)continue;
        pending.delete(msg.id);
        if(msg.error)job.reject(Error('MCP error '+msg.error.code));
        else job.resolve(msg.result);
      }
    });
    const init=await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},
      clientInfo:{name:'isolated-zero-key-benchmark',version:'1.0'}});
    if(!init.serverInfo?.name)throw Error('RuFlo MCP did not initialize');
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    const available=(await rpc('tools/list')).tools||[];
    const required=['swarm_init','agent_spawn','task_create','task_assign','task_complete','task_status'];
    if(required.some(name=>!available.some(x=>x.name===name)))throw Error('Required RuFlo MCP tools absent');
    const swarm=idOf(await invoke('swarm_init',{topology:'hierarchical',maxAgents:3,strategy:'specialized'}),'swarm');
    const roles=['researcher','coder','tester'],agents=[],tasks=[];
    for(const role of roles){
      const data=await invoke('agent_spawn',{agentType:role,swarmId:swarm});
      agents.push(idOf(data,'agent'));
    }
    for(let i=0;i<roles.length;i++){
      const data=await invoke('task_create',{type:['review','fix','verify'][i],
        description:'Synthetic reference-only '+roles[i]+' fixture task',
        priority:'low',tags:['offline-benchmark','no-model']});
      const taskId=idOf(data,'task');
      await invoke('task_assign',{taskId,agentIds:[agents[i]]});
      tasks.push(taskId);
    }
    const results=[];
    const fixedOutputs=[
      'FINDING: synthetic empty average and unnormalized identifier cases fail.',
      'PATCH: apply the pre-reviewed reference fixture unchanged, not model-generated.',
      'CHECK: compare identical seven deterministic cases in disposable scratch directory.'
    ];
    let m;
    for(let i=0;i<3;i++){
      if(i===1)m=await benchmarkFixture();
      const answer=fixedOutputs[i];
      await invoke('task_complete',{taskId:tasks[i],result:{output:answer}});
      const state=await invoke('task_status',{taskId:tasks[i]});
      if(state.status!=='completed'||state.result?.output!==answer)
        throw Error('RuFlo did not persist task completion for '+roles[i]);
      results.push(roleSummary(roles[i],state));
    }
    function roleSummary(role,state){return {role,completed:state.status==='completed'}}
    if(!m||results.length!==3||!results.every(x=>x.completed))throw Error('Native tasks not all verified');
    finish({arm,...m,totalMs:duration(started),nativeTasksCompleted:3,
      roles:results,comparisonScope:'real native MCP task records and identical static reference'});
  }finally{
    rejectAll('Sandbox cleanup');
    if(child){child.stdin.end();child.kill('SIGTERM')}
    rmSync(root,{recursive:true,force:true});
  }
}
