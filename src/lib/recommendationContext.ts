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

export function readRecommendationRequestContext(payload: unknown): RecommendationRequestContext | null {
  if (!isRecord(payload) || !isRecord(payload.requestContext)) return null;
  const actual = payload.requestContext;
  if (
    !Array.isArray(actual.anchors) ||
    actual.anchors.length < 2 ||
    actual.anchors.length > 4 ||
    !isNonEmptyString(actual.energy) ||
    !isNonEmptyString(actual.setting) ||
    !Number.isInteger(actual.durationMinutes)
  ) return null;

  const anchors: RecommendationRequestContext['anchors'] = [];
  for (const item of actual.anchors) {
    if (!isRecord(item) || !isNonEmptyString(item.query)) return null;
    const typeUrn = item.typeUrn === undefined
      ? undefined
      : isNonEmptyString(item.typeUrn)
        ? item.typeUrn
        : null;
    if (typeUrn === null) return null;
    anchors.push({
      query:item.query,
      ...(typeUrn ? { typeUrn } : {}),
    });
  }

  return {
    anchors,
    energy:actual.energy,
    setting:actual.setting,
    durationMinutes:Number(actual.durationMinutes),
  };
}

export function requestContextsMatch(
  actual: RecommendationRequestContext,
  expected: RecommendationRequestContext,
) {
  if (
    actual.energy !== expected.energy ||
    actual.setting !== expected.setting ||
    actual.durationMinutes !== expected.durationMinutes ||
    actual.anchors.length !== expected.anchors.length
  ) return false;

  return actual.anchors.every((item,index) =>
    requestAnchorKey(item.query, item.typeUrn) ===
    requestAnchorKey(expected.anchors[index].query, expected.anchors[index].typeUrn)
  );
}

export function payloadHasMatchingRequestContext(
  payload: unknown,
  expected: RecommendationRequestContext,
) {
  const actual = readRecommendationRequestContext(payload);
  return Boolean(actual && requestContextsMatch(actual, expected));
}
