import { normalizedRequestQuery } from './recommendationContext';
import { qlooEntityIdentity } from './qlooEntityIdentity';

export function qlooSearchCacheKey(
  credentialFingerprint: string,
  query: string,
  typeUrn?: string,
) {
  return `${credentialFingerprint}|${typeUrn ?? 'any'}|${normalizedRequestQuery(query)}`;
}

export function qlooTasteCacheKey(
  credentialFingerprint: string,
  entityIds: string[],
) {
  return `${credentialFingerprint}|${entityIds.map(qlooEntityIdentity).join(',')}`;
}
