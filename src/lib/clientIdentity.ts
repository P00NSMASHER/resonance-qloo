import { createHash } from 'node:crypto';

export function rateLimitClientKey(
  forwarded: string | string[] | undefined,
  remoteAddress: string | undefined,
) {
  const forwardedValues = (Array.isArray(forwarded) ? forwarded : [forwarded])
    .flatMap(value => typeof value === 'string' ? value.split(',') : [])
    .map(value => value.trim())
    .filter(Boolean);

  const nearestForwardedAddress = forwardedValues.at(-1);
  const candidate = nearestForwardedAddress || remoteAddress || 'unknown';
  return createHash('sha256').update(candidate).digest('hex').slice(0, 24);
}
