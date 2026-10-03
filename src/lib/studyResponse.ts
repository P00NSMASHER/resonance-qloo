export const STUDY_VERSION = '2026-10-03-v1';

export const STUDY_ROLES = [
  'activity-director',
  'activity-assistant',
  'family-caregiver',
  'recreation-staff',
  'assisted-living-staff',
  'other-adjacent',
] as const;

export type StudyRole = typeof STUDY_ROLES[number];

export type StudyResponse = {
  studyVersion: typeof STUDY_VERSION;
  responseId: string;
  role: StudyRole;
  baselineSeconds: number;
  resonanceSeconds: number;
  relevance: number;
  novelty: number;
  usefulness: number;
  wouldUse: boolean;
  feedback: string;
  consent: true;
};

const allowedKeys = new Set([
  'studyVersion','responseId','role','baselineSeconds','resonanceSeconds',
  'relevance','novelty','usefulness','wouldUse','feedback','consent',
]);

function hasLikelyPersonalContact(value: string) {
  return /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(value) ||
    /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(value);
}

export function validateStudyResponse(input: unknown): StudyResponse {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('STUDY_INVALID');
  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) if (!allowedKeys.has(key)) throw new Error('STUDY_INVALID');

  if (raw.studyVersion !== STUDY_VERSION) throw new Error('STUDY_INVALID');
  if (typeof raw.responseId !== 'string' || !/^[0-9a-f-]{20,64}$/i.test(raw.responseId)) throw new Error('STUDY_INVALID');
  if (typeof raw.role !== 'string' || !(STUDY_ROLES as readonly string[]).includes(raw.role)) throw new Error('STUDY_INVALID');

  const whole = (value: unknown, min: number, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
  if (!whole(raw.baselineSeconds, 15, 3600)) throw new Error('STUDY_INVALID');
  if (!whole(raw.resonanceSeconds, 5, 1800)) throw new Error('STUDY_INVALID');
  for (const field of ['relevance','novelty','usefulness'] as const) {
    if (!whole(raw[field],1,5)) throw new Error('STUDY_INVALID');
  }
  if (typeof raw.wouldUse !== 'boolean' || raw.consent !== true) throw new Error('STUDY_INVALID');
  if (typeof raw.feedback !== 'string') throw new Error('STUDY_INVALID');
  const feedback = raw.feedback.trim();
  if (feedback.length < 3 || feedback.length > 500 || hasLikelyPersonalContact(feedback)) throw new Error('STUDY_INVALID');

  return {
    studyVersion:STUDY_VERSION,
    responseId:raw.responseId,
    role:raw.role as StudyRole,
    baselineSeconds:raw.baselineSeconds,
    resonanceSeconds:raw.resonanceSeconds,
    relevance:raw.relevance,
    novelty:raw.novelty,
    usefulness:raw.usefulness,
    wouldUse:raw.wouldUse,
    feedback,
    consent:true,
  };
}
