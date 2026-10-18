import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';

if(!process.env.RUFLO_BIN||!existsSync(process.env.RUFLO_BIN))throw Error('RUFLO_BIN missing');
const proc=spawn(process.execPath,[resolve('scripts/ruflo-readonly-facade.mjs')],{
 env:{...process.env,OPENAI_API_KEY:'DO_NOT_PASS_TO_RUFLO_LAB_MARKER',
       ANTHROPIC_API_KEY:'DO_NOT_PASS_TO_RUFLO_LAB_MARKER'},
 stdio:['pipe','pipe','pipe']
});
let output='',nextId=0;const waiting=new Map();
proc.stdout.on('data',chunk=>{
 output+=chunk.toString();
 let end;
 while((end=output.indexOf('\n'))>=0){
   const line=output.slice(0,end);output=output.slice(end+1);
   let obj;try{obj=JSON.parse(line)}catch{throw Error('Facade stdout is not JSON-RPC')}
   const waiter=waiting.get(obj.id);
   if(waiter){waiting.delete(obj.id);clearTimeout(waiter.timer);waiter.resolve(obj)}
 }
});
function call(method,params){
 const id=++nextId;
 return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{waiting.delete(id);reject(Error(method+' timed out'))},45000);
   waiting.set(id,{resolve,reject,timer});
   proc.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
 });
}
try{
 const init=await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'facade-test',version:'1.0'}});
 if(init.result?.serverInfo?.name!=='ruflo-read-only-facade')throw Error('Bad handshake');
 proc.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const tools=await call('tools/list',{});
 if(tools.result?.tools?.length!==1)throw Error('Exactly one tool should be exposed');
 const t=tools.result.tools[0];
 if(t.name!=='ruflo_read_agent_count'||t.annotations?.readOnlyHint!==true||
   t.annotations?.openWorldHint!==false||t.inputSchema?.additionalProperties!==false)throw Error('Wrong tool contract');
 const forbidden=await call('tools/call',{name:'agent_spawn',arguments:{}});
 if(forbidden.error?.code!==-32601)throw Error('Forbidden native tool was not blocked');
 const malformed=await call('tools/call',{name:t.name,arguments:{execute:true}});
 if(malformed.error?.code!==-32602)throw Error('Unexpected arguments accepted');
 const valid=await call('tools/call',{name:t.name,arguments:{}});
 if(valid.result?.isError!==false)throw Error('Valid read-only lookup failed');
 const parsed=JSON.parse(valid.result.content[0].text);
 if(!Number.isSafeInteger(parsed.agentCount)||parsed.source!=='local-ruflo-mcp')throw Error('Bad result shape');
 if(JSON.stringify(valid).includes('DO_NOT_PASS_TO_RUFLO_LAB_MARKER'))throw Error('Secret marker leaked');
 const list2=await call('tools/list',{});
 if(list2.result?.tools?.length!==1)throw Error('Tool list changed after invocation');
 console.log('PASS: MCP initialize, exactly one annotated read-only tool, denied native write tool and invalid args.');
 console.log('PASS: Real RuFlo MCP agent_list proxied with sanitized agentCount='+parsed.agentCount+'.');
 console.log('PASS: Test secret markers absent from returned results.');
}finally{
 proc.stdin.end();proc.kill('SIGTERM');
}
