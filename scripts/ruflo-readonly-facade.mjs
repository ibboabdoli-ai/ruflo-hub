import {spawn} from 'node:child_process';
import {isAbsolute} from 'node:path';

const binary=process.env.RUFLO_BIN;
if(!binary||!isAbsolute(binary))throw Error('RUFLO_BIN must be an absolute executable path');
const TOOL='ruflo_read_agent_count';
const PROTOCOL='2024-11-05';
const MAX_LINE=65536;
const MAX_AGENTS=1000;
const definition={
  name:TOOL,
  description:'Read only the number of agents registered in this isolated local RuFlo instance. No names, commands, task execution, secrets or external data.',
  inputSchema:{type:'object',properties:{},additionalProperties:false},
  annotations:{title:'Read isolated RuFlo agent count',readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
};
function send(value){process.stdout.write(JSON.stringify(value)+'\n')}
function error(id,code,message){send({jsonrpc:'2.0',id,error:{code,message}})}
function scrubbedEnv(){
  // No model, GitHub, Vercel, Turso or application credential is inherited.
  const names=['PATH','HOME','USERPROFILE','XDG_CONFIG_HOME','XDG_CACHE_HOME','NODE_ENV','CI','TMPDIR','TMP','TEMP','LANG'];
  const result={};
  for(const name of names)if(process.env[name])result[name]=process.env[name];
  return result;
}
function readRealCount(){
  return new Promise((resolve,reject)=>{
    let child,finished=false,out='',phase=0;
    const conclude=(failure,value)=>{
      if(finished)return;finished=true;clearTimeout(timer);
      if(child)child.kill('SIGTERM');
      failure?reject(failure):resolve(value);
    };
    const timer=setTimeout(()=>conclude(Error('Upstream RuFlo MCP timed out')),25000);
    function push(method,id,params){
      child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    }
    try{
      child=spawn(binary,['mcp','start'],{
        cwd:process.cwd(),env:scrubbedEnv(),stdio:['pipe','pipe','pipe']
      });
      child.on('error',()=>conclude(Error('Upstream executable failed to launch')));
      child.on('exit',()=>conclude(Error('Upstream RuFlo MCP exited before response')));
      child.stderr.on('data',()=>{}); // Never forward upstream stderr.
      child.stdout.on('data',data=>{
        if(finished)return;
        out+=data.toString();
        if(out.length>MAX_LINE)return conclude(Error('Upstream response oversized'));
        let end;
        while((end=out.indexOf('\n'))>=0){
          const line=out.slice(0,end).trim();out=out.slice(end+1);
          let msg;try{msg=JSON.parse(line)}catch{continue}
          if(phase===0&&msg.id===1&&msg.result?.serverInfo){
            phase=1;
            child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
            push('tools/call',2,{name:'agent_list',arguments:{includeTerminated:true}});
          }else if(phase===1&&msg.id===2){
            if(msg.error||msg.result?.isError)return conclude(Error('Upstream RuFlo reported an error'));
            const items=msg.result?.content;
            if(!Array.isArray(items)||items.length!==1||items[0]?.type!=='text')return conclude(Error('Unexpected upstream response'));
            let data;try{data=JSON.parse(items[0].text)}catch{return conclude(Error('Upstream content not JSON'))}
            if(!Number.isSafeInteger(data.total)||data.total<0||data.total>MAX_AGENTS||
              !Array.isArray(data.agents)||data.agents.length!==data.total){
              return conclude(Error('Upstream agent-count mismatch'));
            }
            // Only a numeric aggregate leaves the facade, never agent metadata.
            return conclude(null,data.total);
          }
        }
      });
      push('initialize',1,{protocolVersion:PROTOCOL,
        capabilities:{},clientInfo:{name:'ruflo-read-only-facade',version:'1.0.0'}});
    }catch{return conclude(Error('Upstream initialization failed'))}
  });
}
let input='',busy=false;
async function handle(msg){
  if(!msg||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return;
  if(msg.id===undefined)return; // Notification
  const id=msg.id;
  switch(msg.method){
    case 'initialize':
      return send({jsonrpc:'2.0',id,result:{protocolVersion:PROTOCOL,
        serverInfo:{name:'ruflo-read-only-facade',version:'1.0.0'},
        capabilities:{tools:{listChanged:false}}}});
    case 'ping':return send({jsonrpc:'2.0',id,result:{}});
    case 'tools/list':return send({jsonrpc:'2.0',id,result:{tools:[definition]}});
    case 'tools/call':{
      const p=msg.params;
      if(p?.name!==TOOL)return error(id,-32601,'Tool not exposed by read-only facade');
      if(p.arguments!==undefined &&
        (!p.arguments||typeof p.arguments!=='object'||Array.isArray(p.arguments)||
         Object.keys(p.arguments).length!==0))return error(id,-32602,'No arguments accepted');
      if(busy)return error(id,-32000,'Facade already processing a request');
      busy=true;
      try{
        const total=await readRealCount();
        return send({jsonrpc:'2.0',id,result:{content:[{type:'text',
          text:JSON.stringify({agentCount:total,source:'local-ruflo-mcp',readOnly:true})}],isError:false}});
      }catch{return error(id,-32001,'Read-only RuFlo lookup failed')}
      finally{busy=false}
    }
    default:return error(id,-32601,'Method not exposed by read-only facade');
  }
}
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{
  input+=chunk;
  if(input.length>MAX_LINE){input='';return}
  let end;
  while((end=input.indexOf('\n'))>=0){
    const line=input.slice(0,end).trim();input=input.slice(end+1);
    try{void handle(JSON.parse(line))}catch{ /* malformed input ignored */ }
  }
});
