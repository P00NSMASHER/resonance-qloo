export type LiveProvenancePayload = {
  provenance?: {
    source?: unknown;
    apiOrigin?: unknown;
    contractVersion?: unknown;
    generatedAt?: unknown;
  } | null;
};

export function hasVerifiedLiveProvenance(
  payload: unknown,
  expectedApiOrigin: string,
  expectedContractVersion: string,
) {
  if (!expectedApiOrigin || !expectedContractVersion || !payload || typeof payload !== 'object') return false;

  const provenance = (payload as LiveProvenancePayload).provenance;
  if (!provenance || typeof provenance !== 'object') return false;
  if (provenance.source !== 'qloo-live') return false;
  if (provenance.apiOrigin !== expectedApiOrigin) return false;
  if (provenance.contractVersion !== expectedContractVersion) return false;
  if (typeof provenance.generatedAt !== 'string') return false;

  const generatedAt = Date.parse(provenance.generatedAt);
  return Number.isFinite(generatedAt);
}
