import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const path=new URL('../.github/workflows/ruflo-receipt-pilot.yml',import.meta.url);
const workflow=readFileSync(path,'utf8');
const lock=JSON.parse(readFileSync(new URL('../locks/receipt-ai/package-lock.json',import.meta.url),'utf8'));
test('native receipt test job uses a stored integrity lock and npm ci only',()=>{
  const native=workflow.split('  receipt-native-tests:')[1];
  assert.ok(native);
  assert.match(native,/npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(native,/cp hub\/locks\/receipt-ai\/package-lock\.json receipt\/package-lock\.json/);
  assert.doesNotMatch(native,/npm install|no-package-lock/);
  assert.match(native,/persist-credentials: false/);
  assert.match(native,/fa9ff4aecabdaeb05f2be54d4b7d649086d0fdd2/);
  assert.match(native,/OPENAI_API_KEY: ''/);
  assert.match(native,/cp hub\/locks\/receipt-ai\/eslint\.config\.mjs receipt\/eslint\.config\.mjs/);
});
test('committed lock has pinned resolved versions and integrity hashes',()=>{
  assert.equal(lock.lockfileVersion,3);
  assert.equal(lock.name,'ibbo-receipt-ai');
  const root=lock.packages[''];
  assert.ok(root);
  assert.equal(root.dependencies['@vercel/blob'],'latest');
  assert.ok(Object.keys(lock.packages).length>400);
  assert.ok(Object.values(lock.packages).some(v=>typeof v.integrity==='string'&&v.integrity.startsWith('sha512-')));
});
