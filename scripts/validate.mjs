import { loadProfiles } from './lib.mjs';

try {
  const entries = loadProfiles();
  if (entries.length === 0) throw new Error('No project profiles');
  const ids = new Set();
  let failed = false;
  for (const { file, profile, issues } of entries) {
    if (ids.has(profile.id)) issues.push('Duplicate project id: ' + profile.id);
    ids.add(profile.id);
    if (issues.length) {
      failed = true;
      console.error('FAIL ' + file + ': ' + issues.join('; '));
    } else console.log('OK ' + file + ' — ' + profile.repository + ' (not connected; read-only policy)');
  }
  if (failed) process.exitCode = 1;
} catch (err) {
  console.error('Validation failed: ' + err.message);
  process.exitCode = 1;
}
