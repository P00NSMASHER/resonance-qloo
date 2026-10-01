import { anchorTypeUrn, isAnchorType } from './anchorTypes';
import type { RecommendationAnchor } from './recommendationService';

const ALLOWED_ENERGY = new Set(['calm','social','active']);
const ALLOWED_SETTING = new Set(['one-on-one','small-group','community']);
const ALLOWED_DURATION_MINUTES = new Set([30,45,60]);

export type NormalizedRecommendationRequest = {
  anchors: RecommendationAnchor[];
  energy: string;
  setting: string;
  durationMinutes: number;
};

export function normalizeRecommendationRequest(body: Record<string, unknown>): NormalizedRecommendationRequest {
  const rawAnchors = Array.isArray(body.anchors) ? body.anchors : [];

  const parsed: RecommendationAnchor[] = rawAnchors.flatMap((raw): RecommendationAnchor[] => {
    if (typeof raw === 'string') {
      const query = raw.trim();
      return query.length >= 2 && query.length <= 100 ? [{ query }] : [];
    }

    if (!raw || typeof raw !== 'object') return [];
    const record = raw as Record<string, unknown>;
    const query = typeof record.query === 'string' ? record.query.trim() : '';
    if (query.length < 2 || query.length > 100) return [];
    if (record.type !== undefined && !isAnchorType(record.type)) return [];

    return [{
      query,
      typeUrn: anchorTypeUrn(isAnchorType(record.type) ? record.type : undefined),
    }];
  });

  const anchors = [...new Map(
    parsed.map(anchor => [
      `${anchor.typeUrn ?? 'any'}|${anchor.query.toLocaleLowerCase('en-US')}`,
      anchor,
    ])
  ).values()].slice(0,4);

  const energy = typeof body.energy === 'string' && ALLOWED_ENERGY.has(body.energy)
    ? body.energy
    : 'calm';
  const setting = typeof body.setting === 'string' && ALLOWED_SETTING.has(body.setting)
    ? body.setting
    : 'small-group';
  const durationMinutes = typeof body.durationMinutes === 'number' && ALLOWED_DURATION_MINUTES.has(body.durationMinutes)
    ? body.durationMinutes
    : 45;

  return { anchors, energy, setting, durationMinutes };
}
