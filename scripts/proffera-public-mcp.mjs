/**
 * Isolated, one-shot, zero-credential MCP stdio companion.
 * Exposes ONLY public PR #941 metadata. No RuFlo agent execution or connection
 * to the Proffera Supervisor; no arbitrary repositories, URLs or source files.
 */
import {inspectPublicProfferaPr} from './inspect-public-proffera-pr.mjs';

const EXPECTED='9ac8b38df37cdcb8a917ea4c10f2cc9f79a750ca';
if(process.env.PROFFERA_EXPECTED_SHA!==EXPECTED)
  throw Error('Expected PR head is not the reviewed pinned SHA');

const TOOL='proffera_observe_public_pr_941';
const PROTOCOL='2024-11-05';
const MAX_LINE_BYTES=8192;
const definition=Object.freeze({
  name:TOOL,
  description:'One public metadata-only observation of Proffera PR #941 at a pinned exact head. No code, secrets, agent execution, write permission, or merge-readiness verdict.',
  inputSchema:{type:'object',properties:{},additionalProperties:false},
  annotations:{title:'Observe public Proffera PR metadata',readOnlyHint:true,
    destructiveHint:false,idempotentHint:true,openWorldHint:false}
});
function emit(value){process.stdout.write(JSON.stringify(value)+'\n');}
function failure(id,code,message){emit({jsonrpc:'2.0',id,error:{code,message}});}
let used=false;
async function handle(msg){
  if(!msg||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return;
  if(msg.id===undefined)return;
  const id=msg.id;
  switch(msg.method){
    case 'initialize':return emit({jsonrpc:'2.0',id,result:{protocolVersion:PROTOCOL,
      serverInfo:{name:'proffera-public-observer',version:'1.0.0'},
      capabilities:{tools:{listChanged:false}}}});
    case 'ping':return emit({jsonrpc:'2.0',id,result:{}});
    case 'tools/list':return emit({jsonrpc:'2.0',id,result:{tools:[definition]}});
    case 'tools/call':{
      if(msg.params?.name!==TOOL)
        return failure(id,-32601,'Tool not exposed by public observer');
      const args=msg.params?.arguments;
      if(args!==undefined && (!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length!==0))
        return failure(id,-32602,'No tool arguments accepted');
      if(used)return failure(id,-32000,'Public observation already attempted');
      used=true;
      try{
        const report=await inspectPublicProfferaPr(EXPECTED);
        return emit({jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(report)}],isError:false}});
      }catch{
        return failure(id,-32001,'NOT VERIFIED: public metadata unavailable');
      }
    }
    default:return failure(id,-32601,'Method not exposed by public observer');
  }
}
let input='',dropping=false;
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{
  input+=chunk;
  let index;
  while((index=input.indexOf('\n'))!==-1){
    const line=input.slice(0,index);input=input.slice(index+1);
    if(dropping||Buffer.byteLength(line,'utf8')>MAX_LINE_BYTES){dropping=false;continue;}
    try{void handle(JSON.parse(line));}catch{ /* Never reflect malformed input. */ }
  }
  if(Buffer.byteLength(input,'utf8')>MAX_LINE_BYTES){input='';dropping=true;}
});
