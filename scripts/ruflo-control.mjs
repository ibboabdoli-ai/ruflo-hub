import { loadProfiles } from './lib.mjs';

const [operation = 'status', project = 'hub'] = process.argv.slice(2);
if (!['status', 'installation-smoke'].includes(operation)) {
  console.error('Unknown operation. Use status or installation-smoke.');
  process.exit(2);
}
if (operation === 'installation-smoke' && project !== 'hub') {
  console.error('Installation smoke is allowed only in the disposable hub sandbox, not an external project.');
  process.exit(2);
}

const profiles = loadProfiles();
if (profiles.length === 0 || profiles.some(entry => entry.issues.length)) {
  console.error('Project configuration failed validation.');
  process.exit(2);
}
if (project !== 'hub' && !profiles.some(entry => entry.profile.id === project)) {
  console.error('Selected project is not configured.');
  process.exit(2);
}

const date = new Date().toISOString();
const lines = [
  '# RuFlo Hub — GitHub control report',
  '',
  '- Generated: ' + date,
  '- Requested operation: ' + operation,
  '- Selected scope: ' + project,
  '- RuFlo pinned smoke-test version: 3.56.10',
  '- Live AI providers: disabled / not configured',
  '- Repository writes, pushes, merges, deploys: disabled',
  '- This workflow is temporary. No agent stays running after the job ends.',
  '',
  '## Registered profiles',
  '',
  '| ID | Repository | Connection | Permissions |',
  '| --- | --- | --- | --- |'
];
for (const { profile: p } of profiles) {
  lines.push('| ' + p.id + ' | ' + p.repository + ' | ' +
    (p.connected ? 'connected' : 'not connected') + ' | read-only policy |');
}
lines.push('', '## Execution boundary', '');
if (operation === 'status') {
  lines.push('This is a static configuration/status report. No RuFlo binary or external project was executed.');
} else {
  lines.push('The next isolated job will install and initialize RuFlo in a disposable scratch folder, never in Proffera.');
}
console.log(lines.join('\n'));
