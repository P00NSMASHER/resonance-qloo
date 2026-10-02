import { qlooEntityIdentity } from './qlooEntityIdentity';

const STAGES = ['resolve','evaluate','compose','explain'] as const;
const DURATIONS = new Set([30,45,60]);
const ENERGIES = new Set(['calm','social','active']);
const SETTINGS = new Set(['one-on-one','small-group','community']);
const RESOLUTION_MATCHES = new Set(['exact-name','top-result']);
const PLAN_TITLES = ['Opening cue','Story bridge','Shared choice','Closing ritual'] as const;
const PLAN_DURATIONS: Record<number, string[]> = {
  30:['5 min','10 min','10 min','5 min'],
  45:['10 min','10 min','15 min','10 min'],
  60:['10 min','20 min','20 min','10 min'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIntegerBetween(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export function hasConsistentRecommendationResult(payload: unknown) {
  if (!isRecord(payload) || !isNonEmptyString(payload.summary)) return false;

  const resolvedAnchors = payload.resolvedAnchors;
  if (!Array.isArray(resolvedAnchors) || resolvedAnchors.length < 2 || resolvedAnchors.length > 4) return false;
  const resolvedEntityIds = new Set<string>();
  const resolvedNames = new Set<string>();
  const resolvedAnchorSequence: string[] = [];
  let exactResolutionCount = 0;
  let topResultResolutionCount = 0;
  let categoryHintCount = 0;
  for (const item of resolvedAnchors) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.query) ||
      !isNonEmptyString(item.name) ||
      !isNonEmptyString(item.entityId) ||
      !RESOLUTION_MATCHES.has(String(item.resolutionMatch))
    ) return false;
    const entityIdentity = qlooEntityIdentity(item.entityId);
    if (resolvedEntityIds.has(entityIdentity)) return false;
    resolvedEntityIds.add(entityIdentity);
    resolvedNames.add(item.name);
    resolvedAnchorSequence.push(item.name);
    if (item.requestedTypeUrn !== undefined && !isNonEmptyString(item.requestedTypeUrn)) return false;
    if (item.resolutionMatch === 'exact-name') exactResolutionCount += 1;
    else topResultResolutionCount += 1;
    if (item.requestedTypeUrn !== undefined) categoryHintCount += 1;
  }

  const affinities = payload.affinities;
  if (!Array.isArray(affinities) || affinities.length < 3 || affinities.length > 8) return false;
  const affinityLabels = new Set<string>();
  const affinityLabelsNormalized = new Set<string>();
  const validatedAffinities: Array<{ label:string; score:number|null; rank:number }> = [];
  let previousRank = 0;
  for (const item of affinities) {
    if (!isRecord(item) || !isNonEmptyString(item.label)) return false;
    const normalizedLabel = item.label.normalize('NFKC').trim().toLocaleLowerCase('en-US');
    if (affinityLabelsNormalized.has(normalizedLabel)) return false;
    affinityLabels.add(item.label);
    affinityLabelsNormalized.add(normalizedLabel);
    if (!Number.isInteger(item.rank) || Number(item.rank) <= previousRank) return false;
    previousRank = Number(item.rank);
    if (
      item.score !== null &&
      (typeof item.score !== 'number' || !Number.isFinite(item.score) || item.score < 0 || item.score > 1)
    ) return false;
    validatedAffinities.push({
      label:item.label,
      score:item.score as number | null,
      rank:Number(item.rank),
    });
  }

  const evidence = payload.evidence;
  if (!isRecord(evidence)) return false;
  if (evidence.evidenceBasis !== 'normalized-score' && evidence.evidenceBasis !== 'ranked-order') return false;
  if (!isIntegerBetween(evidence.selectedAffinityCount, 3, 4)) return false;
  if (!isIntegerBetween(evidence.returnedAffinityCount, 3, 8)) return false;
  if (evidence.returnedAffinityCount !== affinities.length) return false;
  if (Number(evidence.selectedAffinityCount) > Number(evidence.returnedAffinityCount)) return false;
  if (!Array.isArray(evidence.selectedAffinityLabels)) return false;
  if (evidence.selectedAffinityLabels.length !== evidence.selectedAffinityCount) return false;

  const selectedLabels = new Set<string>();
  const selectedSequence: string[] = [];
  for (const label of evidence.selectedAffinityLabels) {
    if (!isNonEmptyString(label) || !affinityLabels.has(label) || selectedLabels.has(label)) return false;
    selectedLabels.add(label);
    selectedSequence.push(label);
  }

  const scoredAffinities = validatedAffinities.filter(
    (item): item is { label:string; score:number; rank:number } => item.score !== null,
  );
  const expectedSelected = evidence.evidenceBasis === 'normalized-score'
    ? [...scoredAffinities].sort((left,right) => right.score - left.score).slice(0,4)
    : [...validatedAffinities].sort((left,right) => left.rank - right.rank).slice(0,4);
  if (evidence.evidenceBasis === 'normalized-score' && scoredAffinities.length < 3) return false;
  if (evidence.evidenceBasis === 'ranked-order' && scoredAffinities.length >= 3) return false;
  if (expectedSelected.length !== evidence.selectedAffinityCount) return false;
  if (expectedSelected.some((item,index) => item.label !== selectedSequence[index])) return false;

  if (evidence.meanNormalizedScore !== null) {
    if (
      typeof evidence.meanNormalizedScore !== 'number' ||
      !Number.isFinite(evidence.meanNormalizedScore) ||
      evidence.meanNormalizedScore < 0 ||
      evidence.meanNormalizedScore > 1
    ) return false;
  }
  if (evidence.evidenceBasis === 'normalized-score') {
    if (evidence.meanNormalizedScore === null) return false;
    const expectedMean = expectedSelected.reduce((sum,item) => sum + (item.score ?? 0), 0) / expectedSelected.length;
    if (Math.abs(evidence.meanNormalizedScore - expectedMean) > 1e-12) return false;
    if (evidence.meanNormalizedScore < 0.2) return false;
  }
  if (evidence.evidenceBasis === 'ranked-order' && evidence.meanNormalizedScore !== null) return false;

  if (evidence.resolvedAnchorCount !== resolvedAnchors.length) return false;
  if (evidence.exactResolutionCount !== exactResolutionCount) return false;
  if (evidence.topResultResolutionCount !== topResultResolutionCount) return false;
  if (evidence.categoryHintCount !== categoryHintCount) return false;
  if (!isIntegerBetween(evidence.explainabilityResultCount, 0, affinities.length)) return false;
  if (typeof evidence.aggregateExplainabilityAvailable !== 'boolean') return false;
  if (!DURATIONS.has(Number(evidence.sessionDurationMinutes))) return false;
  if (!ENERGIES.has(String(evidence.energy))) return false;
  if (!SETTINGS.has(String(evidence.setting))) return false;

  const plan = payload.plan;
  if (!Array.isArray(plan) || plan.length !== 4) return false;
  const expectedPlanLabels = [
    selectedSequence[0],
    selectedSequence[1],
    selectedSequence[2],
    selectedSequence[3] ?? selectedSequence[2],
  ];
  const expectedDurations = PLAN_DURATIONS[Number(evidence.sessionDurationMinutes)];
  if (!expectedDurations) return false;

  const planLabels = new Set<string>();
  const firstPlanLabelSequence: string[] = [];
  let planMinutes = 0;
  for (let index = 0; index < plan.length; index += 1) {
    const item = plan[index];
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.title) ||
      !isNonEmptyString(item.duration) ||
      !isNonEmptyString(item.action) ||
      !isNonEmptyString(item.why) ||
      !isNonEmptyString(item.affinityLabel) ||
      !selectedLabels.has(item.affinityLabel)
    ) return false;
    if (item.title !== PLAN_TITLES[index]) return false;
    if (item.duration !== expectedDurations[index]) return false;
    if (item.affinityLabel !== expectedPlanLabels[index]) return false;

    const expectedAnchorName = resolvedAnchorSequence[index];
    if (expectedAnchorName !== undefined) {
      if (item.anchorName !== expectedAnchorName) return false;
    } else if (item.anchorName !== undefined) {
      return false;
    }

    const durationMatch = item.duration.match(/^(\d+) min$/);
    if (!durationMatch) return false;
    planMinutes += Number(durationMatch[1]);
    if (!planLabels.has(item.affinityLabel)) firstPlanLabelSequence.push(item.affinityLabel);
    planLabels.add(item.affinityLabel);
  }
  if (planMinutes !== evidence.sessionDurationMinutes) return false;
  if (planLabels.size !== selectedLabels.size) return false;
  if (
    firstPlanLabelSequence.length !== selectedSequence.length ||
    firstPlanLabelSequence.some((label,index) => label !== selectedSequence[index])
  ) return false;

  const trace = payload.agentTrace;
  if (!Array.isArray(trace) || trace.length !== STAGES.length) return false;
  for (let index = 0; index < STAGES.length; index += 1) {
    const step = trace[index];
    if (
      !isRecord(step) ||
      step.stage !== STAGES[index] ||
      (step.status !== 'ok' && step.status !== 'warning') ||
      !isNonEmptyString(step.detail)
    ) return false;
  }

  return true;
}


export type RecommendationRequestContext = {
  anchors: Array<{ query:string; typeUrn?:string }>;
  energy: string;
  setting: string;
  durationMinutes: number;
};

function normalizedRequestQuery(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

function requestAnchorKey(query: string, typeUrn?: string) {
  return `${typeUrn ?? 'any'}|${normalizedRequestQuery(query)}`;
}

export function matchesRecommendationRequestContext(
  payload: unknown,
  expected: RecommendationRequestContext,
) {
  if (!isRecord(payload) || !Array.isArray(payload.resolvedAnchors) || !isRecord(payload.evidence)) {
    return false;
  }

  const expectedIndexByKey = new Map(
    expected.anchors.map((anchor,index) => [requestAnchorKey(anchor.query, anchor.typeUrn),index]),
  );
  let previousIndex = -1;

  for (const item of payload.resolvedAnchors) {
    if (!isRecord(item) || !isNonEmptyString(item.query)) return false;
    const typeUrn = item.requestedTypeUrn === undefined
      ? undefined
      : isNonEmptyString(item.requestedTypeUrn)
        ? item.requestedTypeUrn
        : null;
    if (typeUrn === null) return false;

    const expectedIndex = expectedIndexByKey.get(requestAnchorKey(item.query, typeUrn));
    if (expectedIndex === undefined || expectedIndex <= previousIndex) return false;
    previousIndex = expectedIndex;
  }

  return (
    payload.evidence.energy === expected.energy &&
    payload.evidence.setting === expected.setting &&
    payload.evidence.sessionDurationMinutes === expected.durationMinutes
  );
}
