/** One-shot live MCP handshake + public metadata-only read. Zero credentials. */
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';

const sha=process.env.PROFFERA_EXPECTED_SHA;
if(!/^[0-9a-f]{40}$/.test(sha||''))throw Error('Pinned expected SHA missing');
const safeEnv={PATH:process.env.PATH||'',HOME:process.env.HOME||'',
  TMPDIR:process.env.TMPDIR||'',PROFFERA_EXPECTED_SHA:sha,NODE_OPTIONS:''};
const child=spawn(process.execPath,[resolve('scripts/proffera-public-mcp.mjs')],
  {env:safeEnv,stdio:['pipe','pipe','pipe']});
const pending=new Map();let lineBuffer='',counter=0;
function rejectPending(){
  for(const [id,p] of pending){clearTimeout(p.timeout);p.reject(Error('Public MCP observer disconnected'));pending.delete(id)}
}
child.on('error',rejectPending);child.on('exit',rejectPending);
child.stdin.on('error',rejectPending);
child.stdout.on('data',chunk=>{
  lineBuffer+=chunk.toString();
  if(lineBuffer.length>16384){rejectPending();child.kill('SIGTERM');return;}
  let at;
  while((at=lineBuffer.indexOf('\n'))!==-1){
    const frame=lineBuffer.slice(0,at);lineBuffer=lineBuffer.slice(at+1);
    let value;try{value=JSON.parse(frame)}catch{rejectPending();child.kill('SIGTERM');return;}
    const p=pending.get(value.id);
    if(p){pending.delete(value.id);clearTimeout(p.timeout);p.resolve(value);}
  }
});
function call(method,params={}){
  const id=++counter;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(Error('MCP call timed out'))},20000);
    pending.set(id,{resolve,reject,timeout});
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
  });
}
try{
  const init=await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'public-pilot',version:'1.0'}});
  if(init.result?.serverInfo?.name!=='proffera-public-observer')throw Error('MCP handshake invalid');
  const inventory=await call('tools/list');
  if(inventory.result?.tools?.length!==1||
    inventory.result.tools[0].name!=='proffera_observe_public_pr_941'||
    inventory.result.tools[0].annotations?.readOnlyHint!==true)
    throw Error('Unexpected MCP tool inventory');
  const denied=await call('tools/call',{name:'agent_execute',arguments:{}});
  if(denied.error?.code!==-32601)throw Error('Native execution tool exposed');
  const observation=await call('tools/call',{name:'proffera_observe_public_pr_941',arguments:{}});
  if(observation.error||observation.result?.isError!==false)
    throw Error('NOT VERIFIED: live public metadata lookup failed');
  const info=JSON.parse(observation.result.content[0].text);
  if(info.exactSha!==sha||info.target!=='ibboabdoli-ai/Proffera#941'||
    info.result!=='OBSERVED_ONLY_NOT_MERGE_APPROVAL'||
    info.repositoryMutations!==false||info.codeOrSecretsRead!==false)
    throw Error('NOT VERIFIED: observation contract invalid');
  const again=await call('tools/call',{name:'proffera_observe_public_pr_941'});
  if(again.error?.code!==-32000)throw Error('Repeated observation allowed');
  console.log('PASS: independent zero-key Proffera MCP observer; single public metadata-only read, exact pinned PR head.');
  console.log('OBSERVED_ONLY_NOT_MERGE_APPROVAL: PR files='+info.changedFilesReported+', checks='+info.checkRuns+', passed='+info.checksSuccessful+'.');
}finally{
  rejectPending();child.stdin.end();child.kill('SIGTERM');
}
