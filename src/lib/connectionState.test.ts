import { describe, expect, it } from 'vitest';
import { normalizeQlooState, qlooPresentation } from './connectionState';

describe('Qloo connection state', () => {
  it('only marks live mode ready after verified connectivity', () => {
    expect(normalizeQlooState({ qlooConfigured:true, qlooConnected:true, qlooStatus:'ready' })).toBe('ready');
    expect(qlooPresentation('ready').liveReady).toBe(true);
  });

  it('does not confuse a configured-but-broken key with live connectivity', () => {
    expect(normalizeQlooState({ qlooConfigured:true, qlooConnected:false, qlooStatus:'degraded' })).toBe('degraded');
    expect(qlooPresentation('degraded').liveReady).toBe(false);
  });

  it('distinguishes rate limiting from a missing credential', () => {
    expect(normalizeQlooState({ qlooConfigured:true, qlooConnected:false, qlooStatus:'rate-limited' })).toBe('rate-limited');
    expect(normalizeQlooState({ qlooConfigured:false, qlooConnected:false, qlooStatus:'preview' })).toBe('preview');
  });
});
