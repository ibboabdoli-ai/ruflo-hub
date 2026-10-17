import { loadProfiles } from './lib.mjs';

for (const { profile: p, issues } of loadProfiles()) {
  if (issues.length) {
    console.error('Invalid ' + (p.id ?? 'profile') + ': ' + issues.join('; '));
    process.exitCode = 1;
    continue;
  }
  console.log([p.id.padEnd(16),p.repository.padEnd(30),p.mode,'connected: '+p.connected,p.governance].join(' | '));
}
console.log('This is a local inventory only; no network requests, RuFlo processes or GitHub actions were started.');
