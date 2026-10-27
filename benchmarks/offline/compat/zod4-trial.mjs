// LAB ONLY. An experimental source-level compatibility patch applied solely to
// installed artifacts inside the disposable GitHub runner; not a production fix.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root=process.env.RUFLO_COMPAT_INSTALL,runner=process.env.RUNNER_TEMP;
if(!root||!runner||!resolve(root).startsWith(resolve(runner)+'/'))
  throw Error('LAB ONLY: only operate inside disposable GitHub runner temp');
const nm=join(root,'node_modules');
function replaceExpected(file,before,after,label,expected=1){
  const src=readFileSync(file,'utf8'),count=src.split(before).length-1;
  if(count!==expected)throw Error('Unexpected compiled upstream code at '+label+': '+count);
  const result=src.split(before).join(after);
  writeFileSync(file,result);
  const hash=s=>createHash('sha256').update(s).digest('hex');
  console.log('COMPAT_PATCH '+JSON.stringify({label,oldSha256:hash(src),newSha256:hash(result)}));
}
const shared=join(nm,'@claude-flow/shared/dist/core/config/validator.js');
const security=join(nm,'@claude-flow/security/dist/input-validator.js');
replaceExpected(shared,'return error.errors.map((e) => ({','return error.issues.map((e) => ({','shared error.issues');
replaceExpected(security,'case z.ZodIssueCode.invalid_string:',"case 'invalid_format':",'Zod 4 invalid_format');
replaceExpected(security,'issue.validation','issue.format','format field',3);
replaceExpected(security,'return { message: ctx.defaultError };','return undefined;','v4 default error fallback');
replaceExpected(security,
  "export const IPv4Schema = z.string()\n    .ip({ version: 'v4', message: 'Invalid IPv4 address' });",
  "export const IPv4Schema = z.ipv4({ error: 'Invalid IPv4 address' });",'ipv4');
replaceExpected(security,
  "export const IPSchema = z.string()\n    .ip({ message: 'Invalid IP address' });",
  "export const IPSchema = z.union([z.ipv4(), z.ipv6()], { error: 'Invalid IP address' });",'ipv4-ipv6 union');

const zodVersion=JSON.parse(readFileSync(join(nm,'zod/package.json'),'utf8')).version;
assert.equal(zodVersion,'4.6.7');
const sharedModule=await import(pathToFileURL(shared).href);
assert.equal(typeof sharedModule.validateAgentConfig,'function');
const badAgent=sharedModule.validateAgentConfig({});
assert.equal(badAgent.success,false);
assert.ok(Array.isArray(badAgent.errors)&&badAgent.errors.length>0);
assert.ok(badAgent.errors.every(x=>typeof x.message==='string'&&typeof x.path==='string'));
console.log('COMPAT_TEST '+JSON.stringify({name:'invalid shared agent configuration',passed:true,count:badAgent.errors.length}));

const sec=await import(pathToFileURL(security).href);
const {InputValidator,IPv4Schema,IPSchema,EmailSchema,IdentifierSchema}=sec;
assert.equal(typeof InputValidator,'function');
for(const [name,schema,input,expected] of [
  ['IPv4 accepts IPv4',IPv4Schema,'127.0.0.1',true],
  ['IPv4 rejects IPv6',IPv4Schema,'::1',false],
  ['IP accepts IPv4',IPSchema,'127.0.0.1',true],
  ['IP accepts IPv6',IPSchema,'::1',true],
  ['IP rejects malformed address',IPSchema,'999.999.999.999',false],
  ['email accepts valid',EmailSchema,'test@example.com',true],
  ['email rejects invalid',EmailSchema,'not-an-email',false],
  ['identifier accepts valid',IdentifierSchema,'valid_name',true],
  ['identifier rejects dangerous chars',IdentifierSchema,'bad;rm',false]
]){
  assert.equal(schema.safeParse(input).success,expected,name);
  console.log('COMPAT_TEST '+JSON.stringify({name,passed:true}));
}
for(const [name,schema,input,expected] of [
  ['command rejects metacharacters',sec.CommandArgumentSchema,'arg;rm',false],
  ['command accepts harmless arg',sec.CommandArgumentSchema,'--quiet',true],
  ['path rejects traversal',sec.PathSchema,'../../etc/passwd',false],
  ['path accepts simple relative',sec.PathSchema,'data/example.txt',true],
  ['safe string rejects shell expansion',sec.SafeStringSchema,'hello$(evil)',false],
  ['safe string accepts ordinary text',sec.SafeStringSchema,'normal_text',true],
  ['security config applies defaults',sec.SecurityConfigSchema,{},true]
]){
  assert.equal(schema.safeParse(input).success,expected,name);
  console.log('COMPAT_TEST '+JSON.stringify({name,passed:true}));
}
for(const functionName of ['validateTaskConfig','validateSwarmConfig','validateMCPServerConfig']){
  const fn=sharedModule[functionName];
  assert.equal(typeof fn,'function',functionName);
  const result=fn({});
  assert.equal(typeof result.success,'boolean',functionName);
  if(!result.success)assert.ok(Array.isArray(result.errors)&&result.errors.length>0);
  console.log('COMPAT_TEST '+JSON.stringify({name:'shared '+functionName+' invalid/default config',passed:true}));
}
const emailError=EmailSchema.safeParse('bad');
assert.equal(emailError.success,false);
assert.ok(emailError.error.issues.length>0);
assert.equal(typeof emailError.error.issues[0].message,'string');
console.log('COMPAT_SUMMARY '+JSON.stringify({smokeTests:20,passed:true,warning:'lab-only: never deploy modified npm artifacts'}));
