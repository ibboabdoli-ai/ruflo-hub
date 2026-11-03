// Official RuFlo release candidate validator. Public, zero-key, read-only.
// No RuFlo CLI is started and no data from Proffera is ever accessed.
// A passing result is a *candidate smoke test*, never deployment approval.
import {existsSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.env.RUFLO_RELEASE_INSTALL;
const runner=process.env.RUNNER_TEMP;
if(!root||!runner||!resolve(root).startsWith(resolve(runner)+'/')){
  throw Error('RuFlo candidate must be inside disposable GitHub runner temp');
}
const nm=join(root,'node_modules');
const checks=[];
const versions={};
function record(name,ok,detail){
  checks.push({name,ok,detail:String(detail).slice(0,220)});
  console.log('RUFLO_RELEASE_CHECK '+JSON.stringify(checks.at(-1)));
}
function manifest(pkg){
  const path=join(nm,pkg,'package.json');
  if(!existsSync(path)){record(pkg+' installed',false,'package.json missing');return null;}
  const m=JSON.parse(readFileSync(path,'utf8'));
  versions[pkg]=m.version;
  return m;
}
const ruflo=manifest('ruflo');
const cli=manifest('@claude-flow/cli');
const shared=manifest('@claude-flow/shared');
const security=manifest('@claude-flow/security');
const zod=manifest('zod');
const zodV4=/^4\.(\d+)\.(\d+)(?:-|$)/.exec(zod?.version??'');
const safeZod=Boolean(zodV4&&(Number(zodV4[1])>6||(Number(zodV4[1])===6&&Number(zodV4[2])>=6)));
record('installed Zod >= 4.6.6 (security advisory fix)',safeZod,zod?.version??'not installed');
for(const [name,m] of [['cli',cli],['shared',shared],['security',security]]){
  const range=m?.dependencies?.zod||m?.peerDependencies?.zod||'';
  record(name+' declares Zod 4 compatibility',/(?:^|[^\d])4\./.test(range),range||'no declared range');
}
if(ruflo&&cli)record('CLI and wrapper versions agree',ruflo.version===cli.version,
  'ruflo='+ruflo.version+' cli='+cli.version);

if(safeZod&&shared&&security){
  const sharedJs=join(nm,'@claude-flow/shared/dist/core/config/validator.js');
  const securityJs=join(nm,'@claude-flow/security/dist/input-validator.js');
  if(!existsSync(sharedJs)||!existsSync(securityJs)){
    record('compiled validation modules present',false,'required compiled files absent');
  }else{
    try {
      const mod=await import(pathToFileURL(sharedJs).href);
      const result=mod.validateAgentConfig?.({});
      record('invalid agent config returns structured errors',
        result?.success===false&&Array.isArray(result.errors)&&result.errors.length>0,
        'success='+String(result?.success)+' errors='+String(result?.errors?.length));
    }catch(e){record('invalid agent config returns structured errors',false,e?.name+': '+e?.message)}
    try {
      const sec=await import(pathToFileURL(securityJs).href);
      for(const [label,schema,input,accepted] of [
        ['IPv4 valid',sec.IPv4Schema,'127.0.0.1',true],
        ['IPv4 rejects IPv6',sec.IPv4Schema,'::1',false],
        ['IP accepts IPv6',sec.IPSchema,'::1',true],
        ['IP rejects malformed',sec.IPSchema,'999.999.999.999',false],
        ['email rejects malformed',sec.EmailSchema,'not-an-email',false],
        ['command rejects shell injection',sec.CommandArgumentSchema,'arg;rm',false],
        ['path rejects traversal',sec.PathSchema,'../../etc/passwd',false]
      ]){
        try{
          record(label,schema?.safeParse?.(input)?.success===accepted,
            'expected='+accepted);
        }catch(e){record(label,false,e?.name+': '+e?.message)}
      }
    }catch(e){record('security validator imports',false,e?.name+': '+e?.message)}
  }
}else{
  record('security validation smoke',false,'not executed: package or supported Zod 4 baseline missing');
}
const failed=checks.filter(x=>!x.ok);
console.log('RUFLO_RELEASE_READINESS '+JSON.stringify({
  candidate:ruflo?.version??null,versions,
  readyForIsolatedReview:failed.length===0,
  readyForProfferaProduction:false,
  failed:failed.map(x=>x.name),
  note:'No AI calls, no real source or booking data. Full upstream CI, exact lockfile review and independent security review required.'
}));
if(failed.length)process.exitCode=1;
