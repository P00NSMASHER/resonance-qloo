export type QlooUiState = 'checking' | 'preview' | 'ready' | 'degraded' | 'rate-limited';

export function normalizeQlooState(payload: unknown): Exclude<QlooUiState, 'checking'> {
  if (!payload || typeof payload !== 'object') return 'degraded';
  const record = payload as Record<string, unknown>;

  if (record.qlooConnected === true || record.qlooStatus === 'ready') return 'ready';
  if (record.qlooStatus === 'rate-limited') return 'rate-limited';
  if (record.qlooConfigured === true && record.qlooStatus === 'degraded') return 'degraded';
  if (record.qlooConfigured === true && record.qlooConnected !== true) return 'degraded';
  return 'preview';
}

export function qlooPresentation(state: QlooUiState) {
  switch (state) {
    case 'ready':
      return {
        label:'Live Qloo verified',
        helper:'The event credential was verified against Qloo. Live mode is available; preview remains clearly labeled.',
        liveReady:true,
      };
    case 'rate-limited':
      return {
        label:'Qloo temporarily rate-limited',
        helper:'A Qloo credential is configured, but verification is temporarily rate-limited. Preview mode remains available.',
        liveReady:false,
      };
    case 'degraded':
      return {
        label:'Qloo verification needs attention',
        helper:'A credential may be configured, but Qloo could not be verified. Live mode stays disabled rather than pretending it works.',
        liveReady:false,
      };
    case 'preview':
      return {
        label:'Qloo access pending',
        helper:'The event API credential is still pending. Preview data is illustrative and clearly labeled.',
        liveReady:false,
      };
    default:
      return {
        label:'Checking Qloo connection…',
        helper:'Verifying whether the event-issued Qloo credential is actually usable.',
        liveReady:false,
      };
  }
}
