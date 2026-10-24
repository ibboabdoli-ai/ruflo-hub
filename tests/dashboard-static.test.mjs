import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../dashboard/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../dashboard/style.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8');
test('static UI has restrictive CSP and no external runtime dependencies',()=>{
  assert.match(html,/Content-Security-Policy/);
  assert.match(html,/default-src 'none'/);
  assert.match(html,/script-src 'self'/);
  assert.match(html,/connect-src https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com/);
  assert.match(html,/script src="\.\/app\.js"/);
  assert.match(html,/rel="stylesheet" href="\.\/style\.css"/);
  assert.doesNotMatch(html,/<script(?! src=)/i);
  assert.doesNotMatch(html,/on(click|load|error)\s*=/i);
});
test('public REST endpoints are fixed, check records are exact SHA bounded and fail closed',()=>{
  assert.match(js,/ibboabdoli-ai\/ruflo-hub/);
  assert.match(js,/ibboabdoli-ai\/Proffera/);
  assert.match(js,/number:4/);assert.match(js,/number:941/);
  assert.match(js,/pr\.head\.sha/);
  assert.match(js,/check\.runs|c\.check_runs/);
  assert.match(js,/c\.total_count>100/);
  assert.match(js,/item\.head_sha!==pr\.head\.sha/);
  assert.match(js,/credentials:'omit'/);
  assert.match(js,/method:'GET'/);
  assert.doesNotMatch(js,/method:\s*['"](?:POST|PUT|PATCH|DELETE)/i);
  assert.doesNotMatch(js,/\binnerHTML\b|\beval\s*\(|new Function\s*\(/);
});
test('no operational or credential-bearing actions in UI',()=>{
  assert.doesNotMatch(html+js,/api[_-]?key|authorization:\s*|actions\/workflows\/[^'"]*dispatch|workflow_dispatch|merge_pull_request/i);
  assert.ok(css.length>1000);
});
