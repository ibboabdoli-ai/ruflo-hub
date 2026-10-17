import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, rmSync, readdirSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [sourceDir] = process.argv.slice(2);
if (!sourceDir || !existsSync(sourceDir)) throw new Error('Target checkout is missing');
const cli = process.env.RUFLO_BIN;
if (!cli || !existsSync(cli)) throw new Error('Pinned Ruflo executable is missing');
const root = mkdtempSync(join(tmpdir(), 'receipt-ai-ruflo-'));
const scratch = join(root, 'source-copy');
const home = join(root, 'home');
mkdirSync(home, {recursive:true});
const env = {
  ...process.env,
  HOME:home, USERPROFILE:home, XDG_CONFIG_HOME:join(home,'.config'),
  XDG_CACHE_HOME:join(home,'.cache'), CI:'true', DO_NOT_TRACK:'1',
  GITHUB_TOKEN:'', GH_TOKEN:'', OPENAI_API_KEY:'', ANTHROPIC_API_KEY:'',
  OPENROUTER_API_KEY:'', OLLAMA_API_KEY:'', TURSO_DATABASE_URL:'',
  TURSO_AUTH_TOKEN:'', BLOB_READ_WRITE_TOKEN:''
};
function command(args, timeout) {
  const result=spawnSync(resolve(cli), args, {cwd:scratch,env,encoding:'utf8',timeout,maxBuffer:6*1024*1024});
  const output=(result.stdout||'')+'\n'+(result.stderr||'');
  console.log('RuFlo command '+args.join(' ') +': exit='+result.status+
    ', outputChars='+output.length+', timedOut='+Boolean(result.error?.code==='ETIMEDOUT'));
  if(result.error || result.status!==0) {
    throw new Error('RuFlo command failed: '+args.join(' ')+
      '; status='+result.status+'; cause='+(result.error?.code||'nonzero exit')+
      '. Raw scanner output is intentionally withheld from public CI logs.');
  }
  if(!output.trim()) throw new Error('RuFlo returned empty output for '+args.join(' '));
  return output;
}
try {
  cpSync(sourceDir,scratch,{recursive:true,filter:p=>{
    const name=p.replace(/\\/g,'/').split('/').pop();
    return !['.git','node_modules','.env','.swarm','.claude-flow'].includes(name);
  }});
  const count=readdirSync(scratch).length;
  if(!existsSync(join(scratch,'package.json')) || !existsSync(join(scratch,'app'))) {
    throw new Error('Scratch project does not contain the expected receipt application');
  }
  console.log('Read-only receipt pilot on isolated source copy; rootEntries='+count);
  command(['--version'],45000);
  command(['init'],120000);
  command(['agent','list'],60000);
  const scanArgs = ['security', 'scan', '--type', 'code', '--depth', 'deep', '--output', 'json'];
  const scanRun = spawnSync(resolve(cli), scanArgs, {
    cwd:scratch, env, encoding:'utf8', timeout:150000, maxBuffer:6*1024*1024
  });
  if (scanRun.error || (scanRun.status !== 0 && scanRun.status !== 1)) {
    throw new Error('Security scanner could not complete; exit='+scanRun.status+
      ', error='+(scanRun.error?.code||'unknown'));
  }
  let scanResult;
  try { scanResult=JSON.parse((scanRun.stdout||'').trim()); }
  catch { throw new Error('Security scanner did not return valid structured JSON'); }
  const counts=scanResult?.summary;
  if (!counts || !Number.isInteger(counts.total) ||
      !['critical','high','medium','low'].every(k=>Number.isInteger(counts[k]))) {
    throw new Error('Security scan returned incomplete severity counts');
  }
  if (!Array.isArray(scanResult.findings) || scanResult.findings.length!==counts.total) {
    throw new Error('Security scan finding count is inconsistent');
  }
  console.log('RuFlo code pattern scan completed: '+JSON.stringify(counts)+
    ', exit='+scanRun.status+' (a nonzero result can indicate findings)');
  const shortFindings=scanResult.findings.filter(f=>f.severity==='critical'||f.severity==='high').slice(0,8);
  for(const item of shortFindings){
    const clean=(s)=>String(s||'').replace(/[^a-zA-Z0-9_.\\/ :\\-]/g,'').slice(0,130);
    console.log('Finding '+clean(item.severity)+': '+clean(item.type)+
      ' at '+clean(item.location));
  }

  const report=[
    '## RuFlo CLI — Ibbo Receipt AI pilot',
    '',
    '- Pinned source commit: `fa9ff4aecabdaeb05f2be54d4b7d649086d0fdd2`',
    '- RuFlo: `3.56.10` (disposable install)',
    '- Project: `ibboabdoli-ai/Ibbo_Receipt_AI`',
    '- CLI init and agent registry: passed.',
    '- RuFlo code-pattern scan summary: '+JSON.stringify(counts)+'.',
    '- Scan scope: local secrets and source-code patterns; dependency CVE scan was not performed.',
    '- Scanner findings are **leads**, not verified security vulnerabilities.',
    '- **This does not establish that all security issues are absent**; findings were not published in CI logs.',
    '- No real agent LLM calls, GitHub write permissions, customer documents, API credentials, database or deployment.',
    '- Source copied into temporary scratch space and deleted after execution.'
  ].join('\n');
  if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,report+'\n');
  console.log('PASS: RuFlo CLI and structured source scan ran on isolated receipt-app copy; review findings separately.');
} finally {
  rmSync(root,{recursive:true,force:true});
}
