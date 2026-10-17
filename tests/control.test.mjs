import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { root } from '../scripts/lib.mjs';

function run(...args) {
  return spawnSync(process.execPath, [join(root, 'scripts/ruflo-control.mjs'), ...args], {
    encoding: 'utf8', timeout: 10000
  });
}

test('hub status reports offline scope', () => {
  const result = run('status', 'hub');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /not connected/);
  assert.match(result.stdout, /No RuFlo binary or external project was executed/);
});
test('Proffera can be inspected without a live connection', () => {
  const result = run('status', 'proffera');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ibboabdoli-ai\/Proffera/);
  assert.match(result.stdout, /not connected/);
});
test('smoke cannot target Proffera', () => {
  const result = run('installation-smoke', 'proffera');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /disposable hub sandbox/);
});
test('unknown projects are rejected', () => {
  const result = run('status', 'customer-secret');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown project/);
});
