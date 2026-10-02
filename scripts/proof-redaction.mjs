export function redactProof(value, secret = '') {
  const sensitive = typeof secret === 'string' ? secret.trim() : '';

  if (typeof value === 'string') {
    return sensitive && value.includes(sensitive)
      ? value.split(sensitive).join('[REDACTED]')
      : value;
  }
  if (Array.isArray(value)) return value.slice(0, 5).map(item => redactProof(item, sensitive));
  if (!value || typeof value !== 'object') return value;

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('api_key') ||
      lower.includes('apikey') ||
      lower.includes('authorization') ||
      lower.includes('credential') ||
      lower.includes('token')
    ) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (key === 'results' && Array.isArray(item)) {
      out[key] = item.slice(0, 5).map(entry => redactProof(entry, sensitive));
      continue;
    }
    out[key] = redactProof(item, sensitive);
  }
  return out;
}

export function assertSecretAbsent(serialized, secret = '') {
  const sensitive = typeof secret === 'string' ? secret.trim() : '';
  if (sensitive && serialized.includes(sensitive)) {
    throw new Error('Refusing to emit proof artifact containing QLOO_API_KEY.');
  }
}
