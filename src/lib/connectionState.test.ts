import { describe, expect, it } from 'vitest';
import { normalizeQlooState, qlooPresentation, qlooStateAfterRecommendationFailure } from './connectionState';

describe('Qloo connection state', () => {
  it('only marks live mode ready after verified connectivity', () => {
    expect(normalizeQlooState({ qlooConfigured:true, qlooConnected:true, qlooStatus:'ready' })).toBe('ready');
    expect(qlooPresentation('ready').liveReady).toBe(true);
  });

  it('fails closed on contradictory or incomplete ready payloads', () => {
    expect(normalizeQlooState({
      qlooConfigured:true,
      qlooConnected:false,
      qlooStatus:'ready',
    })).toBe('degraded');
    expect(normalizeQlooState({
      qlooConfigured:false,
      qlooConnected:true,
      qlooStatus:'ready',
    })).toBe('degraded');
    expect(normalizeQlooState({
      qlooConfigured:true,
      qlooConnected:true,
      qlooStatus:'degraded',
    })).toBe('degraded');
    expect(normalizeQlooState({})).toBe('degraded');
  });

  it('does not confuse a configured-but-broken key with live connectivity', () => {
    expect(normalizeQlooState({ qlooConfigured:true, qlooConnected:false, qlooStatus:'degraded' })).toBe('degraded');
    expect(qlooPresentation('degraded').liveReady).toBe(false);
  });

  it('downgrades only upstream Qloo recommendation failures', () => {
    expect(qlooStateAfterRecommendationFailure(429, 'Qloo rate limit reached. Please try again later.')).toBe('rate-limited');
    expect(qlooStateAfterRecommendationFailure(502, 'Qloo search request failed (500).')).toBe('degraded');
    expect(qlooStateAfterRecommendationFailure(504, 'Qloo took too long to respond. Please try again.')).toBe('degraded');

    expect(qlooStateAfterRecommendationFailure(429, 'Too many live Qloo requests. Try again in 10s.')).toBeNull();
    expect(qlooStateAfterRecommendationFailure(422, 'Qloo returned too little reliable evidence.')).toBeNull();
    expect(qlooStateAfterRecommendationFailure(400, 'Bad request')).toBeNull();
  });

  it('distinguishes rate limiting from a missing credential', () => {
    expect(normalizeQlooState({ qlooConfigured:true, qlooConnected:false, qlooStatus:'rate-limited' })).toBe('rate-limited');
    expect(normalizeQlooState({ qlooConfigured:false, qlooConnected:false, qlooStatus:'preview' })).toBe('preview');
  });
});
