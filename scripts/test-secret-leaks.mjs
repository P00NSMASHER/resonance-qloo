import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scannerPath = fileURLToPath(new URL('./check-secret-leaks.mjs', import.meta.url));

function runScanner(root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scannerPath], {
      env:{ ...process.env, SECRET_SCAN_ROOT:root },
      stdio:['ignore','pipe','pipe'],
    });
    let stdout='';
    let stderr='';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

const root = await mkdtemp(join(tmpdir(), 'resonance-secret-scan-'));
try {
  await writeFile(join(root, 'safe.txt'), 'QLOO_API_KEY=your_event_key_here\n');
  const safe = await runScanner(root);
  if (safe.code !== 0 || !safe.stdout.includes('Repository secret-leak check passed.')) {
    throw new Error(`Expected safe fixture to pass. stdout=${safe.stdout} stderr=${safe.stderr}`);
  }

  const syntheticKey = 'hack_' + 'a'.repeat(40);
  await writeFile(join(root, 'leak.txt'), `example only: ${syntheticKey}\n`);
  const leaked = await runScanner(root);
  const output = leaked.stdout + '\n' + leaked.stderr;
  if (
    leaked.code === 0 ||
    !output.includes('SECRET LEAK: Qloo hackathon API key') ||
    !output.includes('leak.txt:1')
  ) {
    throw new Error(`Expected synthetic Qloo key fixture to fail. stdout=${leaked.stdout} stderr=${leaked.stderr}`);
  }

  console.log('Repository secret-leak self-test passed.');
} finally {
  await rm(root, { recursive:true, force:true });
}
