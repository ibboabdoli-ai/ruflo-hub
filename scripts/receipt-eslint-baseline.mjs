/**
 * Full ESLint on a public immutable snapshot. Allow only the precisely audited
 * pre-existing findings. Any new / changed finding fails closed.
 * This is NOT a claim that the upstream lint suite is clean.
 */
import {spawnSync} from 'node:child_process';
import {relative,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

export const KNOWN_BASELINE=Object.freeze([
  ['app/receipts/page.tsx','@next/next/no-html-link-for-pages',214,11,2],
  ['postcss.config.mjs','import/no-anonymous-default-export',1,1,1]
]);

export function validateLintReport(reports, root){
  if(!Array.isArray(reports)||!root||!isAbsolute(root))throw Error('Invalid ESLint input');
  const findings=[];
  for(const report of reports){
    if(typeof report.filePath!=='string'||!Array.isArray(report.messages))throw Error('Malformed ESLint report');
    const path=relative(root,report.filePath).replaceAll('\\','/');
    if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))throw Error('ESLint report out of root');
    if(report.fatalErrorCount||report.parseErrorCount)throw Error('ESLint reported fatal errors');
    for(const message of report.messages){
      if(![1,2].includes(message.severity)||!Number.isInteger(message.line)||!Number.isInteger(message.column)
        ||typeof message.ruleId!=='string')throw Error('Malformed ESLint finding');
      findings.push([path,message.ruleId,message.line,message.column,message.severity]);
    }
  }
  findings.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const expected=[...KNOWN_BASELINE].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if(JSON.stringify(findings)!==JSON.stringify(expected))throw Error('New or changed ESLint findings; inspect upstream snapshot');
  return {knownErrors:1,knownWarnings:1,newFindings:0};
}

function main(){
  const arg=process.argv[2];
  if(arg!=='receipt')throw Error('Only isolated Receipt AI source is supported');
  const root=resolve('receipt');
  const cli=resolve(root,'node_modules/eslint/bin/eslint.js');
  const result=spawnSync(process.execPath,[cli,'.','--format','json'],{
    cwd:root,env:{...process.env,NODE_OPTIONS:''},encoding:'utf8',timeout:45000,maxBuffer:6*1024*1024,shell:false
  });
  if(result.error||![0,1].includes(result.status))throw Error('ESLint invocation failed');
  let reports;
  try{reports=JSON.parse(result.stdout)}catch{throw Error('ESLint did not return JSON');}
  const evidence=validateLintReport(reports,root);
  console.log('ESLINT_BASELINE_VERIFIED',JSON.stringify(evidence));
  console.log('NOTE: Pinned external source retains 1 known ESLint error and 1 warning; no new findings.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
