export const STUDY_REVIEW_MANIFEST_VERSION = '2026-10-08-v1' as const;
export const STUDY_REVIEW_ATTESTATION =
  'I personally checked that each listed receipt came from a consenting eligible adult who tested live Resonance; no synthetic, demo, or test fixture is included.' as const;

export type StudyReviewSource = 'anonymous-receipts' | 'impact-csv';

type RecordValue = Record<string, unknown>;
function record(value:unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue : null;
}
function exactKeys(value:RecordValue, expected:string[]) {
  const actual=Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key,i)=>key === [...expected].sort()[i]);
}

/**
 * Explicit human review gate, NOT cryptographic authentication or evidence that
 * a participant exists. A facilitator must privately inspect each real receipt.
 * No participant identities or sensitive comments belong in this manifest.
 */
export function reviewedStudyIds(input:unknown, source:StudyReviewSource, studyVersion:string) {
  const manifest=record(input);
  if (!manifest || !exactKeys(manifest,[
    'manifestVersion','source','studyVersion','reviewedOn','facilitatorAttestation','participants',
  ])) throw new Error('STUDY_REVIEW_INVALID');
  if (
    manifest.manifestVersion !== STUDY_REVIEW_MANIFEST_VERSION ||
    manifest.source !== source ||
    manifest.studyVersion !== studyVersion ||
    manifest.facilitatorAttestation !== STUDY_REVIEW_ATTESTATION ||
    typeof manifest.reviewedOn !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(manifest.reviewedOn) ||
    !Number.isFinite(Date.parse(manifest.reviewedOn+'T00:00:00Z')) ||
    !Array.isArray(manifest.participants)
  ) throw new Error('STUDY_REVIEW_INVALID');
  const ids=new Set<string>();
  for(const raw of manifest.participants) {
    const item=record(raw);
    if (!item || !exactKeys(item,[
      'responseId','consentReviewed','eligibleAdultVerified','receiptReceived','liveResonanceVerified','notFixtureVerified',
    ])) throw new Error('STUDY_REVIEW_INVALID');
    if (
      typeof item.responseId !== 'string' ||
      !/^[a-z0-9_-]{2,64}$/i.test(item.responseId) ||
      item.consentReviewed !== true ||
      item.eligibleAdultVerified !== true ||
      item.receiptReceived !== true ||
      item.liveResonanceVerified !== true ||
      item.notFixtureVerified !== true ||
      ids.has(item.responseId)
    ) throw new Error('STUDY_REVIEW_INVALID');
    ids.add(item.responseId);
  }
  return ids;
}
