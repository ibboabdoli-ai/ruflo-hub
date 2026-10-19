import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const dir='.github/workflows';
const workflows=readdirSync(dir).filter(f=>/\.ya?ml$/.test(f))
  .map(f=>({name:f,text:readFileSync(join(dir,f),'utf8')}));

test('no checked-in GitHub Actions workflow can obtain a paid API secret',()=>{
  for(const {name,text} of workflows) {
    assert.doesNotMatch(text,/\$\{\{\s*secrets\./i,name);
    assert.doesNotMatch(text,/\[run-paid-[^\]]*\]/i,name);
    assert.doesNotMatch(text,/node\s+scripts\/ruflo-tracked-openai-relay\.mjs/i,name);
    assert.doesNotMatch(text,/node\s+scripts\/ruflo-codex-live-mcp\.mjs/i,name);
  }
});

test('Codex credential-free preflight enforces MCP smoke and no paid step',()=>{
  const workflow=workflows.find(w=>w.name==='ruflo-codex-live-mcp.yml');
  assert.ok(workflow);
  assert.match(workflow.text,/node scripts\/ruflo-readonly-facade-smoke\.mjs/);
  assert.match(workflow.text,/node scripts\/ruflo-codex-receipt-audit\.mjs/);
  assert.doesNotMatch(workflow.text,/codex\s+exec/);
});

test('all maintained RuFlo pilot workflows check untracked checkout mutations',()=>{
  for(const {name,text} of workflows.filter(w=>w.name.startsWith('ruflo-'))){
    assert.match(text,/git status --porcelain --untracked-files=all/,name);
  }
});
