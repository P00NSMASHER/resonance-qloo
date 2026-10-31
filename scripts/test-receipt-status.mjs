import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishedStatusMatches } from './receipt-status.mjs';

const expected = Object.freeze({
  contractVersion: '2026-10-02.review-origin-v1',
  qlooApiOrigin: 'https://hackathon.api.qloo.com',
});
const ready = Object.freeze({
  service: 'resonance',
  contractVersion: expected.contractVersion,
  qlooApiOrigin: expected.qlooApiOrigin,
  qlooConfigured: true,
  qlooConnected: true,
  qlooStatus: 'ready',
  mode: 'live',
});

test('accepts the exact live status payload', () => {
  assert.equal(publishedStatusMatches(ready, expected), true);
});
test('accepts Floot SuperJSON-style envelope', () => {
  assert.equal(publishedStatusMatches({ json: ready, meta: { values: {} } }, expected), true);
});
test('rejects false-positive previous ready strings and version echoes', () => {
  for (const payload of [
    { ...ready, service: 'unrelated', message: 'ready', contractVersion: expected.contractVersion },
    { ...ready, qlooStatus: 'degraded', qlooConnected: false, mode: 'preview', message: 'previously ready' },
    { ...ready, qlooStatus: 'not-ready' },
    { ...ready, contractVersion: 'stale', message: expected.contractVersion },
  ]) assert.equal(publishedStatusMatches(payload, expected), false);
});
test('rejects disconnected, unconfigured, preview and incorrect API origin states', () => {
  for (const patch of [
    { qlooConfigured: false },
    { qlooConnected: false },
    { mode: 'preview' },
    { qlooApiOrigin: 'https://untrusted.example' },
  ]) assert.equal(publishedStatusMatches({ ...ready, ...patch }, expected), false);
});
test('rejects null, arrays, nonobjects, and forged envelope fields', () => {
  for (const payload of [
    null, false, 'ready', [], [ready], {}, { json: null, ...ready },
    { json: { qlooStatus: 'degraded' }, ...ready },
  ]) assert.equal(publishedStatusMatches(payload, expected), false);
});
