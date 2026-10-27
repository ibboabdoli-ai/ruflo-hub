import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluate,CASE_NAMES} from '../benchmarks/offline/cases.mjs';
import * as defective from '../benchmarks/offline/defective.mjs';
import * as reference from '../benchmarks/offline/reference.mjs';
import {benchmarkFixture} from '../benchmarks/offline/repair.mjs';

test('two independently specified synthetic defects are reproducible',()=>{
  const baseline=evaluate(defective);
  assert.equal(baseline.length,7);
  assert.ok(baseline.filter(x=>!x.passed).length>=3);
  assert.deepEqual(CASE_NAMES.map(x=>x),baseline.map(x=>x.case));
});
test('exact same pre-reviewed oracle patch repairs all seven cases',()=>{
  const results=evaluate(reference);
  assert.equal(results.filter(x=>x.passed).length,7);
});
test('scratch copy and test runs without writing to source repository',async()=>{
  const s=await benchmarkFixture();
  assert.equal(s.fixtureCases,7);
  assert.ok(s.baselineFailures>=3);
  assert.equal(s.passesAfter,7);
  assert.equal(s.patchOrigin,'pre-reviewed-static-reference');
  assert.equal(s.providerCalls,0);
  assert.equal(s.sourceRepoEdits,0);
  assert.ok(s.repairAndTestMs>=0);
});
test('benchmark documents that it does not measure actual Codex/model reasoning',()=>{
  const script=readFileSync(new URL('../benchmarks/offline/bench.mjs',import.meta.url),'utf8');
  const workflow=readFileSync(new URL('../.github/workflows/ruflo-offline-benchmark.yml',import.meta.url),'utf8');
  assert.match(script,/NOT a Codex\/model benchmark/);
  assert.match(script,/nativeTasksCompleted:3/);
  assert.match(script,/task_complete/);
  assert.match(script,/task_status/);
  assert.match(script,/invoke\('agent_spawn',\{agentType:role,swarmId:swarm\}\)/);
  assert.doesNotMatch(script,/agent_spawn',\{[^}]*task:/);
  assert.match(script,/task_complete',\{taskId:tasks\[i\],result:\{output:answer\}\}/);
  assert.match(script,/state\.result\?\.output!==answer/);
  assert.match(script,/pre-reviewed-static-reference|identical static reference/);
  assert.match(workflow,/permissions:\s*\n  contents: read/);
  assert.match(workflow,/persist-credentials: false/);
  const manifest=JSON.parse(readFileSync(new URL('../benchmarks/offline/deps/package.json',import.meta.url),'utf8'));
  const lock=JSON.parse(readFileSync(new URL('../benchmarks/offline/deps/package-lock.json',import.meta.url),'utf8'));
  assert.equal(manifest.dependencies.ruflo,'3.56.10');
  assert.equal(manifest.dependencies['@metaharness/router'],'0.4.0');
  assert.equal(lock.packages['node_modules/ruflo'].version,'3.56.10');
  assert.match(lock.packages['node_modules/ruflo'].integrity,/^sha512-/);
  assert.equal(lock.packages['node_modules/@metaharness/router'].version,'0.4.0');
  assert.equal(lock.packages['node_modules/ruvector/node_modules/@metaharness/router'].version,'0.3.2');
  assert.match(workflow,/npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(workflow,/sha256sum --check/);
  assert.doesNotMatch(workflow,/npm install |--package-lock-only/);
  assert.match(workflow,/OPENAI_API_KEY: ''/);
  assert.match(workflow,/ANTHROPIC_API_KEY: ''/);
  assert.doesNotMatch(workflow,/secrets\.|contents: write|pull_request_target|deploy-pages|gh pr merge/);
});
