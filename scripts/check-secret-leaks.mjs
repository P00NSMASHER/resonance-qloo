import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

const ROOT = resolve(process.env.SECRET_SCAN_ROOT || process.cwd());
const SKIP_DIRS = new Set(['.git','node_modules','dist','coverage','.vite']);
const MAX_TEXT_BYTES = 2_000_000;

const patterns = [
  {
    name:'Qloo hackathon API key',
    regex:/\bhack_[A-Za-z0-9]{20,}\b/g,
  },
];

async function collectFiles(directory) {
  const out = [];
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...await collectFiles(path));
    } else if (entry.isFile()) {
      const info = await stat(path);
      if (info.size <= MAX_TEXT_BYTES) out.push(path);
    }
  }
  return out;
}

const findings = [];
for (const path of await collectFiles(ROOT)) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    continue;
  }
  for (const { name, regex } of patterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const before = text.slice(0, match.index ?? 0);
      const line = before.split('\n').length;
      findings.push({
        type:name,
        file:relative(ROOT, path) || basename(path),
        line,
      });
    }
  }
}

if (findings.length) {
  for (const finding of findings) {
    console.error(`SECRET LEAK: ${finding.type} pattern detected in ${finding.file}:${finding.line}`);
  }
  console.error('Refusing to pass repository verification while a credential-like Qloo key is present.');
  process.exit(1);
}

console.log('Repository secret-leak check passed.');
