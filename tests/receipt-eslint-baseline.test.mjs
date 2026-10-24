import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLintReport} from '../scripts/receipt-eslint-baseline.mjs';

const root='/tmp/receipt';
const make=()=>[
  {filePath:root+'/app/receipts/page.tsx',messages:[
    {ruleId:'@next/next/no-html-link-for-pages',line:214,column:11,severity:2}
  ]},
  {filePath:root+'/postcss.config.mjs',messages:[
    {ruleId:'import/no-anonymous-default-export',line:1,column:1,severity:1}
  ]}
];
test('precisely known lint baseline passes with zero NEW findings',()=>{
  assert.deepEqual(validateLintReport(make(),root),{knownErrors:1,knownWarnings:1,newFindings:0});
});
test('new error fails the lint gate',()=>{
  const report=make(); report[0].messages.push({ruleId:'no-eval',line:1,column:1,severity:2});
  assert.throws(()=>validateLintReport(report,root),/New or changed/);
});
test('missing or changed historical finding fails (baseline cannot silently drift)',()=>{
  const report=make(); report.pop();
  assert.throws(()=>validateLintReport(report,root),/New or changed/);
});
test('untrusted results outside source directory or malformed results are rejected',()=>{
  assert.throws(()=>validateLintReport([{filePath:'/tmp/outside.js',messages:[]}],root),/out of root/);
  assert.throws(()=>validateLintReport([{filePath:root+'/file.js',messages:[{severity:2}]}],root),/Malformed/);
});
