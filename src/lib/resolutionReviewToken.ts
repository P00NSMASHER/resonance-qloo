import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { qlooEntityIdentity } from './qlooEntityIdentity';
import {
  requestAnchorKey,
  type RecommendationRequestContext,
} from './recommendationContext';

export const RESOLUTION_REVIEW_TOKEN_TTL_MS = 5 * 60_000;

export function resolutionReviewSigningKey(
  qlooApiKey: string,
  qlooApiOrigin: string,
) {
  return createHmac('sha256', qlooApiKey)
    .update('resonance-resolution-review:v1')
    .update('\n')
    .update(qlooApiOrigin)
    .digest();
}

export function resolutionReviewSigningKey(qlooApiKey: string) {
  return createHash('sha256')
    .update('resonance:qloo-review-receipt:v1\0')
    .update(qlooApiKey)
    .digest();
}

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

function reviewMac(
  secret: Uint8Array,
  context: RecommendationRequestContext,
  entityIds: string[],
  expiresAt: number,
) {
  return createHmac('sha256', secret)
    .update(String(expiresAt))
    .update('\n')
    .update(reviewPayload(context, entityIds))
    .digest('base64url');
}

export function createResolutionReviewToken(
  secret: Uint8Array,
  context: RecommendationRequestContext,
  entityIds: string[],
  now = Date.now(),
  ttlMs = RESOLUTION_REVIEW_TOKEN_TTL_MS,
) {
  const expiresAt = now + ttlMs;
  const mac = reviewMac(secret, context, entityIds, expiresAt);
  return `${expiresAt.toString(36)}.${mac}`;
}

export function verifyResolutionReviewToken(
  secret: Uint8Array,
  context: RecommendationRequestContext,
  entityIds: string[],
  token: string | undefined,
  now = Date.now(),
) {
  if (!token) return false;
  const [expiresRaw, actualMac, ...extra] = token.split('.');
  if (!expiresRaw || !actualMac || extra.length) return false;
  const expiresAt = Number.parseInt(expiresRaw, 36);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const expectedMac = reviewMac(secret, context, entityIds, expiresAt);
  const actualBuffer = Buffer.from(actualMac);
  const expectedBuffer = Buffer.from(expectedMac);
  return actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer);
}
