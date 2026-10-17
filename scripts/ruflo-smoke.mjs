import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cli = process.env.RUFLO_BIN;
if (!cli || !existsSync(cli)) {
  throw new Error('RUFLO_BIN is not set to an installed Ruflo executable');
}

const labRoot = mkdtempSync(join(tmpdir(), 'ruflo-isolated-smoke-'));
const projectDir = join(labRoot, 'scratch-project');
const homeDir = join(labRoot, 'home');
mkdirSync(projectDir, { recursive: true });
mkdirSync(homeDir, { recursive: true });

const env = {
  ...process.env,
  HOME: homeDir,
  USERPROFILE: homeDir,
  XDG_CONFIG_HOME: join(homeDir, '.config'),
  XDG_CACHE_HOME: join(homeDir, '.cache'),
  CI: 'true',
  ANTHROPIC_API_KEY: '',
  OPENAI_API_KEY: '',
  OPENROUTER_API_KEY: '',
  OLLAMA_API_KEY: '',
  GH_TOKEN: '',
  GITHUB_TOKEN: ''
};

function run(args, timeout) {
  console.log('Checking: ruflo ' + args.join(' '));
  const result = spawnSync(resolve(cli), args, {
    cwd: projectDir,
    env,
    timeout,
    encoding: 'utf8',
    maxBuffer: 6 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    const output = (result.stderr || result.stdout || '').slice(-2500);
    throw new Error('Command failed (status=' + result.status + '): ' + args.join(' ') +
      '\n' + (result.error ? result.error.message : output));
  }
  const output = ((result.stdout || '') + '\n' + (result.stderr || '')).trim();
  console.log(output.slice(0, 1200));
}

try {
  run(['--version'], 45000);
  run(['--help'], 45000);
  run(['init'], 120000);
  const items = readdirSync(projectDir, { withFileTypes: true })
    .map(entry => entry.name);
  console.log('Initialized only disposable sandbox. Top-level output: ' + items.join(', '));
  const expected = ['CLAUDE.md', '.claude', '.claude-flow', '.mcp.json', '.codex'];
  if (!expected.some(name => existsSync(join(projectDir, name)))) {
    throw new Error('Init exited successfully but no recognized Ruflo config files were created');
  }
  console.log('PASS: CLI installed, launched and initialized a disposable project without API credentials');
} finally {
  rmSync(labRoot, { recursive: true, force: true });
}
