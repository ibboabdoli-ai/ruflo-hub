import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const dir='.github/workflows';
const workflows=readdirSync(dir).filter(f=>/\.ya?ml$/.test(f))
  .map(f=>({name:f,text:readFileSync(join(dir,f),'utf8')}));

// Fail closed if any GitHub expression accesses the secrets context, including
// toJSON(secrets), bracket access, embedded functions and multiline expressions.
function accessesActionsSecrets(text) {
  const expressions=text.matchAll(/\$\{\{([\s\S]*?)\}\}/g);
  for (const expression of expressions) {
    if (/\bsecrets\b/i.test(expression[1])) return true;
  }
  // Reusable workflows can also import all caller secrets with no expression.
  return /^\s*secrets:\s*inherit\s*(?:#.*)?$/im.test(text);
}


test('no checked-in GitHub Actions workflow can obtain a paid API secret',()=>{
  for(const {name,text} of workflows) {
    assert.equal(accessesActionsSecrets(text),false,name);
    assert.doesNotMatch(text,/\[run-paid-[^\]]*\]/i,name);
    assert.doesNotMatch(text,/node\s+scripts\/ruflo-tracked-openai-relay\.mjs/i,name);
    assert.doesNotMatch(text,/node\s+scripts\/ruflo-codex-live-mcp\.mjs/i,name);
  }
});

test('Codex credential-free preflight enforces MCP smoke and no paid step',()=>{
  const workflow=workflows.find(w=>w.name==='ruflo-codex-live-mcp.yml');
  assert.ok(workflow);
  assert.match(workflow.text,/node scripts\/ruflo-readonly-facade-smoke\.mjs/);
  assert.match(workflow.text,/node --check lib\/codex-mcp-proof\.mjs/);
  assert.doesNotMatch(workflow.text,/codex\s+exec/);
});

test('all maintained RuFlo pilot workflows check untracked checkout mutations',()=>{
  for(const {name,text} of workflows.filter(w=>[
    'ruflo-codex-live-mcp.yml',
    'ruflo-tracked-openai-relay.yml',
    'ruflo-readonly-facade.yml'
  ].includes(w.name))){
    assert.match(text,/git status --porcelain --untracked-files=all/,name);
  }
});

test('secret guard rejects direct, indirect, multiline and inherited credential access',()=>{
  const forbidden=[
    "${{ secrets.OPENAI_API_KEY }}",
    "${{ secrets['OPENAI_API_KEY'] }}",
    '${{ secrets["OPENAI_API_KEY"] }}',
    '${{ toJSON(secrets) }}',
    '${{ fromJSON(toJSON(secrets)).OPENAI_API_KEY }}',
    '${{ format(\'{0}\', secrets.OPENAI_API_KEY) }}',
    '${{\n toJSON(\n secrets\n )\n }}',
    '    secrets: inherit'
  ];
  for (const input of forbidden) assert.equal(accessesActionsSecrets(input),true,input);
  const harmless=['${{ github.ref }}','${{ vars.SOME_SETTING }}',
    '      # No secret is read here'];
  for (const input of harmless) assert.equal(accessesActionsSecrets(input),false,input);
});
