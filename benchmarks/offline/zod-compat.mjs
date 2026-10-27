// Runtime compatibility diagnostic for lab-only RuFlo Zod v4 override.
// Do not use as a blanket upstream security or production approval.
// Intentionally fails closed if a known validation error path is incompatible.
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.env.RUFLO_COMPAT_INSTALL;
const runner=process.env.RUNNER_TEMP;
if(!root||!runner||!resolve(root).startsWith(resolve(runner)+'/')){
  throw Error('Compatibility check requires the isolated GitHub runner install');
}
const nm=join(root,'node_modules');
const evidence=[];
const hazards=[];
function record(area,ok,detail){
  const item={area,ok,detail:String(detail).slice(0,360)};
  evidence.push(item);
  console.log('ZOD_COMPAT_EVIDENCE '+JSON.stringify(item));
  if(!ok)hazards.push(item);
}
function locate(packageName,basename){
  const dir=join(nm,packageName);
  if(!existsSync(dir))return [];
  const stack=[dir],out=[];
  let visited=0;
  while(stack.length&&visited<16000){
    const current=stack.pop();
    let files;try{files=readdirSync(current,{withFileTypes:true})}catch{continue}
    for(const f of files){
      visited++;
      if(f.isDirectory()){
        if(f.name==='node_modules'||f.name==='.git'||f.name==='test'||f.name==='tests')continue;
        if(stack.length<3000)stack.push(join(current,f.name));
      }else if(f.isFile()&&f.name===basename)out.push(join(current,f.name));
    }
  }
  return out;
}
const zodPath=join(nm,'zod','index.js');
if(!existsSync(zodPath))throw Error('Reviewed Zod package is missing');
const {z}=await import(pathToFileURL(zodPath).href);
const zodVersion=JSON.parse(readFileSync(join(nm,'zod','package.json'),'utf8')).version;
record('pinned Zod 4',zodVersion==='4.6.7','installed='+zodVersion);
const parsed=z.string().safeParse(17);
record('Zod error shape',!parsed.success&&Array.isArray(parsed.error.issues),'issues array='+String(!parsed.success&&Array.isArray(parsed.error.issues)));
if(!parsed.success){
  const legacyErrors=parsed.error.errors;
  record('legacy ZodError.errors API expected by upstream',
    Array.isArray(legacyErrors),
    'Zod 4 .errors='+(legacyErrors===undefined?'undefined':'present')+'; .issues='+String(Array.isArray(parsed.error.issues)));
}
const sharedFiles=locate('@claude-flow/shared','validator.js').filter(p=>/core[/\\]config[/\\]/.test(p));
record('installed @claude-flow/shared config validator',sharedFiles.length>0,
  sharedFiles.map(p=>p.slice(nm.length+1)).join(', ')||'compiled validator not found');
for(const file of sharedFiles){
  const code=readFileSync(file,'utf8');
  record('shared validator legacy error access',!/\.errors\.map\s*\(/.test(code),
    /\.errors\.map\s*\(/.test(code)?'compiled module reads error.errors.map(...)':'no legacy error.errors.map found');
  try{
    const module=await import(pathToFileURL(file).href);
    if(typeof module.validateAgentConfig!=='function'){
      record('shared invalid config runtime',false,'validateAgentConfig not exported');
    }else{
      try{
        const result=module.validateAgentConfig({});
        record('shared invalid config runtime',result?.success===false&&Array.isArray(result?.errors),
          'returned success='+String(result?.success)+' errorsArray='+String(Array.isArray(result?.errors)));
      }catch(error){
        record('shared invalid config runtime',false,error?.name+': '+error?.message);
      }
    }
  }catch(error){record('shared config validator module import',false,error?.name+': '+error?.message)}
}
const securityFiles=locate('@claude-flow/security','input-validator.js');
record('installed @claude-flow/security input validator',securityFiles.length>0,
  securityFiles.map(p=>p.slice(nm.length+1)).join(', ')||'compiled input validator not found');
for(const file of securityFiles){
  const code=readFileSync(file,'utf8');
  const oldMap=/(?:ctx\.defaultError|\.invalid_string)/.test(code);
  record('security Zod error map uses v4-compatible contract',!oldMap,
    oldMap?'compiled module references removed v3 issue / ctx.defaultError':'no known old signature marker');
  try{
    await import(pathToFileURL(file).href);
    try{
      const result=z.object({field:z.string()}).safeParse({field:9});
      record('security custom error map on invalid input',result.success===false&&Array.isArray(result.error?.issues),
        'success='+String(result.success)+' issues='+String(result.error?.issues?.length));
    }catch(error){record('security custom error map on invalid input',false,error?.name+': '+error?.message)}
  }catch(error){record('security validator module import',false,error?.name+': '+error?.message)}
}
console.log('ZOD_COMPAT_SUMMARY '+JSON.stringify({checks:evidence.length,failed:hazards.length,failedAreas:hazards.map(x=>x.area)}));
if(hazards.length)throw Error('Blocked: RuFlo's upstream Zod v3 validation contracts are not verified with forced Zod 4');
