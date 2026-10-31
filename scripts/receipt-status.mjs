/** Validate the *actual* live Qloo status, not substrings in an HTTP response. */
export function publishedStatusMatches(payload, expected) {
  const body = payload && typeof payload === 'object' && !Array.isArray(payload)
    && Object.prototype.hasOwnProperty.call(payload, 'json')
    ? payload.json
    : payload;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  return body.service === 'resonance'
    && body.contractVersion === expected.contractVersion
    && body.qlooApiOrigin === expected.qlooApiOrigin
    && body.qlooConfigured === true
    && body.qlooConnected === true
    && body.qlooStatus === 'ready'
    && body.mode === 'live';
}
