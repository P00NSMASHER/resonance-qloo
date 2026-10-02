export type RecommendationRequestContext = {
  anchors: Array<{ query:string; typeUrn?:string }>;
  energy: string;
  setting: string;
  durationMinutes: number;
};

type ContextInput = {
  anchors: Array<{ query:string; typeUrn?:string }>;
  energy: string;
  setting: string;
  durationMinutes?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizedRequestQuery(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

export function requestAnchorKey(query: string, typeUrn?: string) {
  return `${typeUrn ?? 'any'}|${normalizedRequestQuery(query)}`;
}

export function recommendationRequestContext(input: ContextInput): RecommendationRequestContext {
  return {
    anchors:input.anchors.map(anchor => ({
      query:anchor.query,
      ...(anchor.typeUrn ? { typeUrn:anchor.typeUrn } : {}),
    })),
    energy:input.energy,
    setting:input.setting,
    durationMinutes:input.durationMinutes ?? 45,
  };
}

export function payloadHasMatchingRequestContext(
  payload: unknown,
  expected: RecommendationRequestContext,
) {
  if (!isRecord(payload) || !isRecord(payload.requestContext)) return false;
  const actual = payload.requestContext;

  if (
    actual.energy !== expected.energy ||
    actual.setting !== expected.setting ||
    actual.durationMinutes !== expected.durationMinutes ||
    !Array.isArray(actual.anchors) ||
    actual.anchors.length !== expected.anchors.length
  ) return false;

  for (let index = 0; index < expected.anchors.length; index += 1) {
    const item = actual.anchors[index];
    const wanted = expected.anchors[index];
    if (!isRecord(item) || !isNonEmptyString(item.query)) return false;
    const typeUrn = item.typeUrn === undefined
      ? undefined
      : isNonEmptyString(item.typeUrn)
        ? item.typeUrn
        : null;
    if (typeUrn === null) return false;
    if (requestAnchorKey(item.query, typeUrn) !== requestAnchorKey(wanted.query, wanted.typeUrn)) {
      return false;
    }
  }

  return true;
}
