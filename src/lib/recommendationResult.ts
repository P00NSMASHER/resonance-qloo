const STAGES = ['resolve','evaluate','compose','explain'] as const;
const DURATIONS = new Set([30,45,60]);
const ENERGIES = new Set(['calm','social','active']);
const SETTINGS = new Set(['one-on-one','small-group','community']);
const RESOLUTION_MATCHES = new Set(['exact-name','top-result']);

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
  for (const item of resolvedAnchors) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.query) ||
      !isNonEmptyString(item.name) ||
      !isNonEmptyString(item.entityId) ||
      !RESOLUTION_MATCHES.has(String(item.resolutionMatch))
    ) return false;
    if (item.requestedTypeUrn !== undefined && !isNonEmptyString(item.requestedTypeUrn)) return false;
  }

  const affinities = payload.affinities;
  if (!Array.isArray(affinities) || affinities.length < 3 || affinities.length > 8) return false;
  const affinityLabels = new Set<string>();
  for (const item of affinities) {
    if (!isRecord(item) || !isNonEmptyString(item.label)) return false;
    if (affinityLabels.has(item.label)) return false;
    affinityLabels.add(item.label);
    if (!Number.isInteger(item.rank) || Number(item.rank) < 1) return false;
    if (
      item.score !== null &&
      (typeof item.score !== 'number' || !Number.isFinite(item.score) || item.score < 0 || item.score > 1)
    ) return false;
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
  for (const label of evidence.selectedAffinityLabels) {
    if (!isNonEmptyString(label) || !affinityLabels.has(label) || selectedLabels.has(label)) return false;
    selectedLabels.add(label);
  }

  if (evidence.meanNormalizedScore !== null) {
    if (
      typeof evidence.meanNormalizedScore !== 'number' ||
      !Number.isFinite(evidence.meanNormalizedScore) ||
      evidence.meanNormalizedScore < 0 ||
      evidence.meanNormalizedScore > 1
    ) return false;
  }
  if (evidence.evidenceBasis === 'normalized-score' && evidence.meanNormalizedScore === null) return false;
  if (evidence.evidenceBasis === 'ranked-order' && evidence.meanNormalizedScore !== null) return false;

  if (evidence.resolvedAnchorCount !== resolvedAnchors.length) return false;
  if (!isIntegerBetween(evidence.exactResolutionCount, 0, resolvedAnchors.length)) return false;
  if (!isIntegerBetween(evidence.topResultResolutionCount, 0, resolvedAnchors.length)) return false;
  if (Number(evidence.exactResolutionCount) + Number(evidence.topResultResolutionCount) !== resolvedAnchors.length) return false;
  if (!isIntegerBetween(evidence.categoryHintCount, 0, resolvedAnchors.length)) return false;
  if (!isIntegerBetween(evidence.explainabilityResultCount, 0, affinities.length)) return false;
  if (typeof evidence.aggregateExplainabilityAvailable !== 'boolean') return false;
  if (!DURATIONS.has(Number(evidence.sessionDurationMinutes))) return false;
  if (!ENERGIES.has(String(evidence.energy))) return false;
  if (!SETTINGS.has(String(evidence.setting))) return false;

  const plan = payload.plan;
  if (!Array.isArray(plan) || plan.length !== 4) return false;
  const planLabels = new Set<string>();
  for (const item of plan) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.title) ||
      !isNonEmptyString(item.duration) ||
      !isNonEmptyString(item.action) ||
      !isNonEmptyString(item.why) ||
      !isNonEmptyString(item.affinityLabel) ||
      !selectedLabels.has(item.affinityLabel)
    ) return false;
    if (item.anchorName !== undefined && !isNonEmptyString(item.anchorName)) return false;
    planLabels.add(item.affinityLabel);
  }
  if (planLabels.size !== selectedLabels.size) return false;
  for (const label of selectedLabels) if (!planLabels.has(label)) return false;

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
