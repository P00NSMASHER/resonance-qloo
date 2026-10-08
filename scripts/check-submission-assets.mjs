import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const errors = [];
const sourceFile = path => readFile(new URL(path, root));
const sourceText = async path => (await sourceFile(path)).toString('utf8');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const png = Buffer.from([137,80,78,71,13,10,26,10]);

const gallery = JSON.parse(await sourceText('docs/judge-gallery/manifest.json'));
const requiredGallery = [
  '00-brand-desktop.png','00-brand-iphone.png','01-input.png',
  '02-qloo-transformation.png','03-finished-session.png',
  '04-study-desktop.png','04-study-iphone.png',
];
if (gallery.captureType !== 'actual-published-browser-screenshots' ||
    gallery.source !== 'https://resonance-qloo.floot.app' ||
    !Number.isFinite(Date.parse(gallery.captureDateUtc)) ||
    !Array.isArray(gallery.files) ||
    gallery.files.length !== requiredGallery.length) {
  errors.push('Current judge gallery provenance manifest missing or malformed.');
}
const seen = new Set();
for (const record of gallery.files ?? []) {
  const name = record?.name;
  if (typeof name !== 'string' || !requiredGallery.includes(name) || seen.has(name)) {
    errors.push('Unexpected/duplicate screenshot entry.');
    continue;
  }
  seen.add(name);
  const bytes = await sourceFile('docs/judge-gallery/'+name);
  if (!bytes.subarray(0,8).equals(png) ||
      bytes.length < 20000 ||
      bytes.length !== record.bytes ||
      sha256(bytes) !== record.sha256) {
    errors.push('Current screenshot file differs from immutable capture manifest: '+name);
  }
  if (bytes.length >= 24) {
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width < 350 || height < 300) errors.push('Screenshot too small: '+name);
    if (name.includes('iphone') && width > 450) errors.push('Phone screenshot viewport unexpected: '+name);
    if (name.includes('desktop') && width < 1200) errors.push('Desktop screenshot viewport unexpected: '+name);
  }
}
for (const name of requiredGallery) if (!seen.has(name)) errors.push('Missing required gallery screenshot: '+name);

for (const [name,minWidth,minHeight] of [
  ['resonance-cultural-atlas.png',1000,500],
  ['resonance-connection-emblem.png',1000,1000],
]) {
  const bytes = await sourceFile('public/brand/'+name);
  if (!bytes.subarray(0,8).equals(png) || bytes.length < 100000 ||
      bytes.readUInt32BE(16)<minWidth || bytes.readUInt32BE(20)<minHeight) {
    errors.push('Original brand asset unavailable or below specification: '+name);
  }
}
const svg = await sourceText('public/brand/resonance-symbol.svg');
if (!svg.includes('xmlns="http://www.w3.org/2000/svg"') ||
    !svg.includes('Resonance cultural connection symbol')) {
  errors.push('Missing editable wave emblem source.');
}

const app = await sourceText('src/App.tsx');
for (const needle of ['/brand/resonance-cultural-atlas.png','/brand/resonance-connection-emblem.png']) {
  if (!app.includes(needle)) errors.push('Portable app still missing first-party original asset: '+needle);
}
if (app.includes('resonance-qloo.floot.app/_cdn/static/')) errors.push('Portable app still depends on external Floot CDN for brand art.');

const readme=await sourceText('README.md');
const devpost=await sourceText('docs/DEVPOST_SUBMISSION_2026.md');
const fields=await sourceText('docs/DEVPOST_FIELDS.md');
const license=await sourceText('LICENSE');
for (const [label,textValue,needles] of [
  ['README',readme,['docs/judge-gallery/README.md','https://resonance-qloo.floot.app']],
  ['Devpost fields',fields,['DEVPOST_SUBMISSION_2026.md','https://devpost.com/software/resonance-nud9ek']],
  ['Copy-ready submission',devpost,[
    'https://qloo.devpost.com/','https://resonance-qloo.floot.app',
    'https://github.com/P00NSMASHER/resonance-qloo',
    'four', 'Qloo', 'zero', '4/5', 'not yet applied',
  ]],
  ['Open-source license',license,['MIT License','Permission is hereby granted']],
]) {
  for (const needle of needles) if (!textValue.toLowerCase().includes(needle.toLowerCase())) {
    errors.push(label+' missing required verifiable claim/URL: '+needle);
  }
}
if (errors.length) {
  for (const error of errors) console.error('FAIL:',error);
  process.exitCode = 1;
} else {
  console.log(
    'Submission assets verified: 7 non-expiring screenshot PNGs with SHA-256 manifests, '+
    '2 original first-party brand images, editable SVG, public license, and honest Devpost copy.'
  );
}
