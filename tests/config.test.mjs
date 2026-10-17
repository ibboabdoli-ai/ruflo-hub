import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, validateProfile, loadProfiles } from '../scripts/lib.mjs';

const base = JSON.parse(readFileSync(join(root, 'templates/project.example.json'), 'utf8'));
test('all included project profiles are valid', () => {
  const entries = loadProfiles();
  assert.ok(entries.length > 0);
  assert.ok(entries.every(e => e.issues.length === 0));
});
test('template passes read-only constraints', () => assert.deepEqual(validateProfile(base), []));
test('writing, merging or deploying is rejected', () => {
  for (const key of ['write', 'merge', 'deploy']) {
    const modified = structuredClone(base);
    modified.permissions[key] = true;
    assert.ok(validateProfile(modified).some(s => s.includes('Permission ' + key)));
  }
});
test('live connection is rejected', () => {
  const modified = structuredClone(base);
  modified.connected = true;
  assert.ok(validateProfile(modified).some(s => s.includes('No live connections')));
});
test('unsupported config keys are rejected', () => {
  const modified = { ...base, command: 'curl example.com' };
  assert.ok(validateProfile(modified).some(s => s.includes('Unexpected key: command')));
});
test('cross-project namespace is rejected', () => {
  const modified = structuredClone(base);
  modified.namespace = 'project:proffera';
  assert.ok(validateProfile(modified).some(s => s.includes('namespace must match')));
});
