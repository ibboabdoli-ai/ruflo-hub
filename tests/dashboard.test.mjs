import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const html=readFileSync(join(process.cwd(),'docs/index.html'),'utf8');
const css=readFileSync(join(process.cwd(),'docs/dashboard.css'),'utf8');
const script=readFileSync(join(process.cwd(),'docs/dashboard.js'),'utf8');

test('dashboard is a static Persian RTL page without inline executable content',()=>{
  assert.match(html, /lang="fa" dir="rtl"/);
  assert.match(html, /<script src="dashboard\.js" defer><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="dashboard\.css">/);
  assert.doesNotMatch(html, /<script(?![^>]*src=)/);
  assert.doesNotMatch(html, /<style\b|\sstyle="/);
  assert.doesNotMatch(html, /<iframe\b|<form\b|<input\b/i);
});

test('CSP restricts code, styles and network to GitHub public API origins',()=>{
  const policy=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(policy,'CSP missing');
  for(const directive of [
    "default-src 'none'","script-src 'self'","style-src 'self'",
    'connect-src https://api.github.com https://raw.githubusercontent.com',
    "object-src 'none'","base-uri 'none'","form-action 'none'"
  ])assert.ok(policy[1].includes(directive),directive);
  assert.doesNotMatch(policy[1],/unsafe-inline|unsafe-eval/);
});

test('public API sources are fixed, SHA checked and no authenticated or mutable requests exist',()=>{
  for(const source of [
    'ibboabdoli-ai/ruflo-hub/pulls/4',
    'ibboabdoli-ai/Proffera/pulls/941',
    'profiles/proffera.json'
  ])assert.ok(script.includes(source),source);
  for(const required of [
    'const allowed = new Set(',"method:'GET'","credentials:'omit'",
    "redirect:'error'","referrerPolicy:'no-referrer'",
    'const shaPattern = /^[0-9a-f]{40}$/'
  ])assert.ok(script.includes(required),required);
  assert.doesNotMatch(script,/localStorage|sessionStorage|document\.cookie|Authorization|access_token|innerHTML|outerHTML|insertAdjacentHTML/);
  assert.doesNotMatch(script,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
});

test('remote data is displayed as text, and missing evidence remains unverified',()=>{
  assert.match(script,/\.textContent\s*=/);
  assert.ok(script.includes("status==='rejected'"));
  assert.ok(script.includes('پروفایل قابل تأیید نیست'));
  assert.ok(script.includes('فهرست بررسی‌ها ناقص'));
  assert.ok(css.length>1500);
});

test('all six mutating permissions must be explicitly disabled before read-only profile claim',()=>{
  for(const name of ['write','commit','push','merge','deploy','manageSecrets'])
    assert.ok(script.includes("'"+name+"'"),name);
  assert.ok(script.includes('mutatingPermissions.every'));
  assert.ok(script.includes('profile.permissions?.[key]===false'));
});
test('dashboard does not claim knowledge of live agent or Supervisor state',()=>{
  assert.doesNotMatch(html,/عامل‌های RuFlo در Proffera فعال نشده‌اند/);
  assert.ok(html.includes('وضعیت عملیاتی عامل‌ها'));
  assert.ok(script.includes('وضعیت واقعی عامل‌ها یا Supervisor تأیید نشده'));
});
