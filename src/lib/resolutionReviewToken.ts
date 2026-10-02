import { createHmac, timingSafeEqual } from 'node:crypto';
import { qlooEntityIdentity } from './qlooEntityIdentity';
import {
  requestAnchorKey,
  type RecommendationRequestContext,
} from './recommendationContext';

function reviewPayload(
  context: RecommendationRequestContext,
  entityIds: string[],
) {
  return JSON.stringify({
    anchors:context.anchors.map(anchor => requestAnchorKey(anchor.query, anchor.typeUrn)),
    energy:context.energy,
    setting:context.setting,
    durationMinutes:context.durationMinutes,
    entityIds:[...new Set(entityIds.map(qlooEntityIdentity))].sort(),
  });
}

export function createResolutionReviewToken(
  secret: Uint8Array,
  context: RecommendationRequestContext,
  entityIds: string[],
) {
  return createHmac('sha256', secret)
    .update(reviewPayload(context, entityIds))
    .digest('base64url');
}

export function verifyResolutionReviewToken(
  secret: Uint8Array,
  context: RecommendationRequestContext,
  entityIds: string[],
  token: string | undefined,
) {
  if (!token) return false;
  const expected = createResolutionReviewToken(secret, context, entityIds);
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer);
}
