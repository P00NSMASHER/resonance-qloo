import { access, readFile } from 'node:fs/promises';

const LIVE_URL = 'https://resonance-qloo.floot.app';
const requiredFiles = [
  'LICENSE',
  'README.md',
  'openapi.yaml',
  'docs/JUDGING.md',
  'docs/SUBMISSION_EVIDENCE.md',
  'docs/KNOWN_LIMITATIONS.md',
  'docs/DEVPOST_FIELDS.md',
  'SECURITY.md',
  'scripts/qloo-mcp-proof.mjs',
  'src/App.tsx',
  'server/index.ts',
];

const failures = [];
const notes = [];

for (const path of requiredFiles) {
  try {
    await access(path);
  } catch {
    failures.push(`Missing required project artifact: ${path}`);
  }
}

try {
  const license = await readFile('LICENSE', 'utf8');
  if (!/MIT License/i.test(license)) failures.push('LICENSE is not recognizably MIT.');
} catch {}

try {
  const openapi = await readFile('openapi.yaml', 'utf8');
  if (!openapi.includes('selectedAffinityLabels')) {
    failures.push('OpenAPI contract is missing selectedAffinityLabels evidence.');
  }
  if (!openapi.includes('returnedAffinityCount')) {
    failures.push('OpenAPI contract is missing returnedAffinityCount evidence.');
  }
  if (!/required:\s*\[title, duration, action, why, affinityLabel\]/.test(openapi)) {
    failures.push('OpenAPI PlanItem no longer requires affinityLabel bridge evidence.');
  }
  if (!/const:\s*qloo-live/.test(openapi)) {
    failures.push('OpenAPI provenance no longer pins live responses to qloo-live.');
  }
} catch {}

try {
  const readme = await readFile('README.md', 'utf8');
  if (!readme.includes(LIVE_URL)) failures.push('README does not include the public demo URL.');
  if (!readme.includes('https://devpost.com/software/resonance-nud9ek')) {
    failures.push('README does not include the Devpost project URL.');
  }
  if (!/illustrative demo/i.test(readme)) {
    failures.push('README does not clearly document the illustrative-demo provenance state.');
  }
} catch {}

try {
  const proof = await readFile('scripts/qloo-mcp-proof.mjs', 'utf8');
  if (!proof.includes('0.1.26')) {
    failures.push('Qloo MCP proof no longer enforces the event harness minimum version 0.1.26.');
  }
  if (!proof.includes('harness_version')) {
    failures.push('Qloo MCP proof artifact no longer records the harness version.');
  }
} catch {}

try {
  const app = await readFile('src/App.tsx', 'utf8');
  if (!app.includes('className="signalCount"')) {
    failures.push('Results UI is missing selected-versus-returned signal counts.');
  }
  if (!app.includes('result.evidence.returnedAffinityCount')) {
    failures.push('Results UI is not using first-class returnedAffinityCount evidence.');
  }
  if (!app.includes('Selection rule')) {
    failures.push('Results UI is missing the Qloo signal selection rule.');
  }
  if (!app.includes('Plan signal #')) {
    failures.push('Results UI is missing numbered selected Qloo signals.');
  }
  if (!app.includes('Additional evidence')) {
    failures.push('Results UI no longer distinguishes supporting Qloo evidence.');
  }
  if (!app.includes('No synthetic signal')) {
    failures.push('Results UI is missing the sparse-evidence no-synthetic-signal disclosure.');
  }
} catch {}

try {
  const sessionExport = await readFile('src/lib/sessionExport.ts', 'utf8');
  if (!sessionExport.includes('selected Qloo signal #')) {
    failures.push('Session export is missing numbered selected Qloo signals.');
  }
  if (!sessionExport.includes('additional Qloo evidence')) {
    failures.push('Session export no longer distinguishes additional Qloo evidence.');
  }
  if (!sessionExport.includes('Selection evidence:')) {
    failures.push('Session export is missing selected-versus-returned evidence counts.');
  }
  if (!sessionExport.includes('returnedAffinityCount')) {
    failures.push('Session export is not preserving first-class returnedAffinityCount evidence.');
  }
  if (!sessionExport.includes('Signal reuse:')) {
    failures.push('Session export is missing the sparse-evidence signal-reuse disclosure.');
  }
} catch {}

if (!process.argv.includes('--offline')) {
  try {
    const response = await fetch(LIVE_URL, { redirect:'follow', signal:AbortSignal.timeout(8000) });
    if (!response.ok) failures.push(`Public demo returned HTTP ${response.status}.`);
    else notes.push(`Public demo reachable: HTTP ${response.status}.`);
  } catch (error) {
    failures.push(`Public demo could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
}

notes.push('Demo video is not required by the current Qloo Devpost submission requirements.');
notes.push('Final submission must remain blocked until the event-issued Qloo credential is connected and end-to-end live Qloo use is verified.');

for (const note of notes) console.log('NOTE:', note);

if (failures.length) {
  for (const failure of failures) console.error('FAIL:', failure);
  process.exit(1);
}

console.log('Submission preflight passed.');
