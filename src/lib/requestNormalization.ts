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
  confirmedEntityIds: string[];
  reviewToken?: string;
};

const ALLOWED_REQUEST_KEYS = new Set([
  'anchors',
  'energy',
  'setting',
  'durationMinutes',
  'confirmedEntityIds',
  'reviewToken',
]);

export function recommendationRequestValidationError(body: Record<string, unknown>) {
  for (const key of Object.keys(body)) {
    if (!ALLOWED_REQUEST_KEYS.has(key)) return `Unsupported request field: ${key}.`;
  }

  if (!Array.isArray(body.anchors) || body.anchors.length < 2 || body.anchors.length > 4) {
    return 'anchors must contain between 2 and 4 cultural anchors.';
  }

  for (const raw of body.anchors) {
    if (typeof raw === 'string') {
      const query = raw.trim();
      if (query.length < 2 || query.length > 100) {
        return 'Each cultural anchor must contain 2–100 characters.';
      }
      continue;
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return 'Each cultural anchor must be a string or an anchor object.';
    }

    const record = raw as Record<string, unknown>;
    if (Object.keys(record).some(key => key !== 'query' && key !== 'type')) {
      return 'Anchor objects may contain only query and type.';
    }

    const query = typeof record.query === 'string' ? record.query.trim() : '';
    if (query.length < 2 || query.length > 100) {
      return 'Each cultural anchor query must contain 2–100 characters.';
    }
    if (record.type !== undefined && !isAnchorType(record.type)) {
      return 'Anchor type is not supported.';
    }
  }

  if (typeof body.energy !== 'string' || !ALLOWED_ENERGY.has(body.energy)) {
    return 'energy must be one of calm, social, or active.';
  }
  if (typeof body.setting !== 'string' || !ALLOWED_SETTING.has(body.setting)) {
    return 'setting must be one of one-on-one, small-group, or community.';
  }
  if (
    body.durationMinutes !== undefined &&
    (typeof body.durationMinutes !== 'number' || !ALLOWED_DURATION_MINUTES.has(body.durationMinutes))
  ) {
    return 'durationMinutes must be 30, 45, or 60.';
  }

  if (body.confirmedEntityIds !== undefined) {
    if (!Array.isArray(body.confirmedEntityIds) || body.confirmedEntityIds.length > 4) {
      return 'confirmedEntityIds must contain at most 4 Qloo entity IDs.';
    }
    for (const value of body.confirmedEntityIds) {
      if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 200) {
        return 'Each confirmed Qloo entity ID must contain 1–200 characters.';
      }
    }
  }

  if (
    body.reviewToken !== undefined &&
    (typeof body.reviewToken !== 'string' || body.reviewToken.trim().length < 1 || body.reviewToken.trim().length > 128)
  ) {
    return 'reviewToken must contain 1–128 characters.';
  }

  return null;
}

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
  const confirmedEntityIds = Array.isArray(body.confirmedEntityIds)
    ? [...new Set(body.confirmedEntityIds.flatMap(value => {
        if (typeof value !== 'string') return [];
        const id = value.trim();
        return id.length > 0 && id.length <= 200 ? [id] : [];
      }))].slice(0,4)
    : [];
  const reviewToken = typeof body.reviewToken === 'string' && body.reviewToken.trim().length <= 128
    ? body.reviewToken.trim()
    : undefined;

  return {
    anchors,
    energy,
    setting,
    durationMinutes,
    confirmedEntityIds,
    ...(reviewToken ? { reviewToken } : {}),
  };
}
