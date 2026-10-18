import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cli = process.env.RUFLO_BIN;
if (!cli || !existsSync(cli)) throw new Error('Pinned RuFlo executable not installed');
const root = mkdtempSync(join(tmpdir(), 'ruflo-three-agent-'));
const workspace = join(root, 'workspace');
const home = join(root, 'home');
mkdirSync(workspace, {recursive:true});
mkdirSync(home, {recursive:true});
const env = {...process.env, HOME:home, USERPROFILE:home,
  XDG_CONFIG_HOME:join(home,'.config'), XDG_CACHE_HOME:join(home,'.cache'),
  CI:'true', DO_NOT_TRACK:'1',
  ANTHROPIC_API_KEY:'', CLAUDE_API_KEY:'', OPENAI_API_KEY:'',
  OPENROUTER_API_KEY:'', GOOGLE_API_KEY:'', GEMINI_API_KEY:'',
  GROQ_API_KEY:'', OLLAMA_API_KEY:'',
  GITHUB_TOKEN:'', GH_TOKEN:'', TURSO_DATABASE_URL:'', TURSO_AUTH_TOKEN:'',
  BLOB_READ_WRITE_TOKEN:'', VERCEL_TOKEN:''
};
function run(args, timeout=50000) {
  const label = 'ruflo ' + args.join(' ');
  const started = Date.now();
  const result=spawnSync(resolve(cli), args, {
    cwd:workspace, env, encoding:'utf8', timeout, maxBuffer:3*1024*1024
  });
  const output=(result.stdout||'')+'\n'+(result.stderr||'');
  console.log(label+' | exit='+result.status+
    ' | ms='+(Date.now()-started)+' | chars='+output.length);
  if(result.error || result.status!==0){
    // Only include a limited snippet of output from this secretless disposable runner.
    const sanitized=output.replace(/(sk-[A-Za-z0-9_-]{8,})/g,'[redacted]').slice(-1300);
    throw Error(label+' failed: '+(result.error?.code||result.status)+' '+sanitized);
  }
  return output;
}
const summary=[];
try{
  summary.push('## RuFlo three-agent registration sandbox');
  summary.push('');
  summary.push('**Scope:** ephemeral workspace; zero API credentials; no real LLM requests.');
  run(['--version']);
  run(['init'],120000);
  const swarm=run(['swarm','init','--topology','hierarchical','--max-agents','3','--strategy','specialized'],60000);
  console.log('Swarm init reported '+swarm.length+' characters');
  const roles=[
    {type:'researcher',name:'lab-researcher'},
    {type:'coder',name:'lab-coder'},
    {type:'tester',name:'lab-tester'}
  ];
  for(const role of roles){
    const out=run(['agent','spawn','--type',role.type,'--name',role.name],50000);
    console.log('Agent spawn '+role.type+' returned '+out.length+' characters');
  }
  const list=run(['agent','list'],60000);
  console.log('Agent registry returned '+list.length+' characters');
  const found=roles.filter(role=>list.toLowerCase().includes(role.name));
  summary.push('Swarm initialization: PASS.');
  summary.push('Agent spawn calls succeeded: '+roles.length+'/3.');
  summary.push('Agent names visible in registry: '+found.length+'/3.');
  if(found.length!==roles.length) throw Error('Spawn returned success but not all expected agents appear in registry: '+found.map(x=>x.name).join(','));
  summary.push('');
  summary.push('**This verifies CLI swarm/agent registration, not intelligence, communication, task execution, self-repair, or spending.**');
  console.log('PASS: three agents registered in disposable RuFlo instance with no LLM keys');
}catch(error){
  summary.push('Result: FAIL or partial — '+String(error.message||error).slice(0,230).replace(/[<>]/g,''));
  throw error;
}finally{
  if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary.join('\n')+'\n');
  rmSync(root,{recursive:true,force:true});
}
