import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
const keys = ['schemaVersion', 'id', 'repository', 'defaultBranch', 'namespace', 'mode', 'connected', 'governance', 'permissions', 'notes'];
const permissions = ['read', 'write', 'commit', 'push', 'merge', 'deploy', 'manageSecrets'];

export function validateProfile(p) {
  const issues = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['Profile must be an object'];
  for (const key of Object.keys(p)) if (!keys.includes(key)) issues.push('Unexpected key: ' + key);
  for (const key of keys) if (!(key in p)) issues.push('Missing key: ' + key);
  if (p.schemaVersion !== 1) issues.push('schemaVersion must be 1');
  if (typeof p.id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(p.id)) issues.push('Invalid project id');
  if (typeof p.repository !== 'string' || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(p.repository)) issues.push('Invalid GitHub owner/repo');
  if (typeof p.defaultBranch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(p.defaultBranch) || p.defaultBranch.includes('..') || p.defaultBranch.endsWith('/') || p.defaultBranch.includes('//')) issues.push('Invalid branch');
  if (p.namespace !== 'project:' + p.id) issues.push('namespace must match project:<id>');
  if (p.mode !== 'read_only') issues.push('Only read_only mode is allowed in this starter');
  if (p.connected !== false) issues.push('No live connections are allowed in this starter');
  if (!['existing_supervisor', 'owner_approval_required'].includes(p.governance)) issues.push('Unknown governance');
  if (!p.permissions || typeof p.permissions !== 'object' || Array.isArray(p.permissions)) issues.push('Invalid permissions object');
  else {
    for (const key of Object.keys(p.permissions)) if (!permissions.includes(key)) issues.push('Unexpected permission: ' + key);
    for (const key of permissions) {
      if (p.permissions[key] !== (key === 'read')) issues.push('Permission ' + key + ' must be ' + (key === 'read'));
    }
  }
  if (typeof p.notes !== 'string' || p.notes.length > 500) issues.push('notes must be a string <= 500 characters');
  return issues;
}

export function loadProfiles(base = root) {
  const dir = join(base, 'profiles');
  return readdirSync(dir).filter(name => name.endsWith('.json')).sort().map(name => {
    const p = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    return { file: name, profile: p, issues: validateProfile(p) };
  });
}
