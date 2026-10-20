import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const dir='.github/workflows';
const workflows=readdirSync(dir).filter(f=>/\.ya?ml$/.test(f))
  .map(f=>({name:f,text:readFileSync(join(dir,f),'utf8')}));

// Fail closed on the entire secrets token in Actions workflow YAML.
// This intentionally forbids even harmless references: expressions,
// quoted keys, flow-style YAML, comments and scalar spelling variants.
// Also forbid YAML hex/Unicode escapes that could disguise a key.
// This is an offline regression tripwire, NOT a GitHub permission boundary.
function accessesActionsSecrets(text) {
  return /\bsecrets\b/i.test(text) ||
    /\\(?:x[0-9a-f]{2}|u[0-9a-f]{4}|U[0-9a-f]{8})/i.test(text);
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
    '    secrets: inherit',
    "    secrets : inherit",
    "    secrets: \"inherit\"",
    "    secrets: 'inherit'",
    "    'secrets': inherit",
    "    \"secrets\": \"inherit\"",
    "    { uses: org/repo/.github/workflows/test.yml@main, secrets: inherit }",
    "    { \"secrets\": \"inherit\" }",
    "    secrets:\n      OPENAI_API_KEY: ${{ vars.INDIRECT_KEY }}",
    "    \"\\x73ecrets\": inherit",
    "    \"\\u0073ecrets\": inherit",
    "    \"\\U00000073ecrets\": inherit"
  ];
  for (const input of forbidden) assert.equal(accessesActionsSecrets(input),true,input);
  const harmless=['${{ github.ref }}','${{ vars.SOME_SETTING }}',
    '      # No secret is read here'];
  for (const input of harmless) assert.equal(accessesActionsSecrets(input),false,input);
});
