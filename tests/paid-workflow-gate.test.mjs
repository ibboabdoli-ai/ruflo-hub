import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const dir='.github/workflows';
const guard=resolve('scripts/check-workflow-credentials.rb');
const workflows=readdirSync(dir).filter(f=>/\.ya?ml$/.test(f))
  .map(f=>({name:f,text:readFileSync(join(dir,f),'utf8')}));

// Check decoded YAML, not just the raw text, to stop key spelling bypasses.
function violatesWorkflowPolicy(source) {
  const proc=spawnSync('ruby',['-r',guard,'-e','WorkflowSecretsGuard.verify!(STDIN.read)'],
    {input:source,encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
  assert.ifError(proc.error);
  return proc.status!==0;
}

test('no checked-in GitHub Actions workflow can obtain a paid API secret',()=>{
  for(const {name,text} of workflows) {
    assert.equal(violatesWorkflowPolicy(text),false,name);
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
  for (const input of forbidden) assert.equal(violatesWorkflowPolicy(input),true,input);
  const harmless=['${{ github.ref }}','${{ vars.SOME_SETTING }}',
    'name: safe fixture\n      # No secret is read here'];
  for (const input of harmless) assert.equal(violatesWorkflowPolicy(input),false,input);
});

test('parsed YAML detects escaped and line-joined secrets keys',()=>{
  const denied=[
    'jobs:\n  x:\n    ? "sec\\\n      rets"\n    : inherit',
    'jobs:\n  x:\n    ? "sec\\\n      rets"\n    : "inherit"',
    'jobs:\n  x:\n    "\\u0073ecrets": inherit',
    'jobs:\n  x:\n    "\\x73ecrets": inherit',
    'jobs: {x: {secrets: inherit}}',
    'jobs:\n  x:\n    secrets : inherit',
    'jobs:\n  x:\n    a: &ref value\n    b: *ref',
    'jobs:\n  x: [',
    '---\nname: first\n---\nname: second'
  ];
  for(const yaml of denied)assert.equal(violatesWorkflowPolicy(yaml),true,yaml);
  assert.equal(violatesWorkflowPolicy('name: ok\non: push\njobs: {x: {runs-on: ubuntu-latest}}'),false);
});
