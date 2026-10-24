import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../dashboard/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../dashboard/style.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8');
test('static UI has restrictive CSP and no remote scripts or inline event handlers',()=>{
  assert.match(html,/Content-Security-Policy/);
  assert.match(html,/default-src 'none'/);
  assert.match(html,/script-src 'self'/);
  assert.match(html,/connect-src https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com/);
  assert.match(html,/script src="\.\/app\.js"/);
  assert.match(html,/rel="stylesheet" href="\.\/style\.css"/);
  assert.doesNotMatch(html,/<script(?! src=)/i);
  assert.doesNotMatch(html,/on(click|load|error)\s*=/i);
  assert.doesNotMatch(html,/https?:\/\/(?:cdn|unpkg|fonts\.)/i);
});
test('main SHA and public PR list endpoints are fixed, bounded and validated',()=>{
  assert.match(js,/ibboabdoli-ai\/ruflo-hub/);
  assert.match(js,/ibboabdoli-ai\/Proffera/);
  assert.match(js,/\/branches\/main/);
  assert.match(js,/\/pulls\?state=open&sort=updated&direction=desc&per_page=/);
  assert.match(js,/MAX_CHECKS=20,MAX_PRS=5,SUPERVISOR_PR=941/);
  assert.match(js,/data\.total_count>limit/);
  assert.match(js,/item\.head_sha!==sha/);
  assert.match(js,/credentials:'omit'/);
  assert.match(js,/method:'GET'/);
  assert.doesNotMatch(js,/method:\s*['"](?:POST|PUT|PATCH|DELETE)/i);
  assert.doesNotMatch(js,/\binnerHTML\b|\beval\s*\(|new Function\s*\(/);
});
test('dashboard disclaims direct Supervisor connectivity and handles unknown data',()=>{
  assert.match(html,/نه مانیتورینگ مستقیم Supervisor/);
  assert.match(html,/نتایج ناقص/);
  assert.match(js,/if\(complete\)/);
  assert.match(js,/if\(partial\)issues\.push/);
  assert.ok(css.length>2000);
});
test('owner-triggered Pages publisher remains manual only',()=>{
  const pages=readFileSync(new URL('../.github/workflows/dashboard-pages.yml',import.meta.url),'utf8');
  assert.match(pages,/workflow_dispatch:/);
  assert.doesNotMatch(pages,/^\s+push:/m);
  assert.match(pages,/github\.repository == 'ibboabdoli-ai\/ruflo-hub'/);
  assert.match(pages,/github\.ref == 'refs\/heads\/main'/);
  assert.match(pages,/persist-credentials: false/);
  assert.match(pages,/path: \.\/dashboard/);
  assert.match(pages,/pages: write/);
  assert.match(pages,/id-token: write/);
});

test('CI categories and Supervisor alert remain separate and explicitly evidence-based',()=>{
  for(const id of ['success','failed','cancelled','skipped','pending','unknown','supervisor-alert'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/item\.conclusion==='cancelled'/);
  assert.match(js,/item\.conclusion==='skipped'/);
  assert.match(js,/item\.conclusion==='failure'/);
  assert.match(js,/item\.conclusion==='neutral'/);
  assert.match(js,/function tally\(items\)/);
  assert.match(js,/set\('supervisor-alert'/);
  assert.match(html,/تأیید فعالیت لحظه‌ای Supervisor|نه مانیتورینگ مستقیم Supervisor/);
  assert.doesNotMatch(js,/\binnerHTML\b/);
});
