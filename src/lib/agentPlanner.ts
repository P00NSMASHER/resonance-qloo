import type { Affinity, PlanItem, QlooExplainabilitySummary, ResolvedAnchor } from './qlooLogic';
import { planFromTags } from './qlooLogic';

export type AgentTraceStep = {
  stage: 'resolve' | 'evaluate' | 'compose' | 'explain';
  status: 'ok' | 'warning';
  detail: string;
};

export type AgentSession = {
  plan: PlanItem[];
  agentTrace: AgentTraceStep[];
  evidence: {
    meanNormalizedScore: number | null;
    evidenceBasis: 'normalized-score' | 'ranked-order';
    selectedAffinityCount: number;
    resolvedAnchorCount: number;
    categoryHintCount: number;
    explainabilityResultCount: number;
    aggregateExplainabilityAvailable: boolean;
    sessionDurationMinutes: number;
    energy: string;
    setting: string;
  };
};

export function orchestrateSession(
  resolvedAnchors: ResolvedAnchor[],
  affinities: Affinity[],
  energy: string,
  setting: string,
  qlooExplainability: QlooExplainabilitySummary = { resultCount:0, aggregateAvailable:false },
  durationMinutes = 45,
): AgentSession {
  if (resolvedAnchors.length < 2 || affinities.length < 3) {
    throw new Error('QLOO_EVIDENCE_TOO_SPARSE');
  }

  const scored = affinities
    .filter((x): x is Affinity & { score:number } => x.score !== null && Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score);

  const usingScores = scored.length >= 3;
  const selected = (usingScores ? scored : [...affinities].sort((a,b) => a.rank - b.rank)).slice(0, 4);
  const meanNormalizedScore = usingScores
    ? scored.slice(0, 4).reduce((sum, x) => sum + x.score, 0) / scored.slice(0, 4).length
    : null;

  if (meanNormalizedScore !== null && meanNormalizedScore < 0.2) {
    throw new Error('QLOO_EVIDENCE_TOO_WEAK');
  }

  const plan = planFromTags(
    selected,
    energy,
    setting,
    resolvedAnchors.map(anchor => anchor.name),
    durationMinutes,
  );
  const evidenceBasis = usingScores ? 'normalized-score' : 'ranked-order';
  const categoryHintCount = resolvedAnchors.filter(anchor => Boolean(anchor.requestedTypeUrn)).length;

  return {
    plan,
    evidence: {
      meanNormalizedScore,
      evidenceBasis,
      selectedAffinityCount: selected.length,
      resolvedAnchorCount: resolvedAnchors.length,
      categoryHintCount,
      explainabilityResultCount:qlooExplainability.resultCount,
      aggregateExplainabilityAvailable:qlooExplainability.aggregateAvailable,
      sessionDurationMinutes:durationMinutes,
      energy,
      setting,
    },
    agentTrace: [
      {
        stage: 'resolve',
        status: 'ok',
        detail: `Resolved ${resolvedAnchors.length} cultural anchors into Qloo-backed entity evidence; ${categoryHintCount} used an explicit category hint.`,
      },
      {
        stage: 'evaluate',
        status: 'ok',
        detail: usingScores
          ? `Selected ${selected.length} highest-scoring affinities; mean normalized score ${Math.round((meanNormalizedScore ?? 0) * 100)}%.`
          : `Selected the first ${selected.length} tags from Qloo's affinity-ranked result order. No numeric score was invented because this response did not provide one.`,
      },
      {
        stage: 'compose',
        status: 'ok',
        detail: `Kept the resolved favorites visible while adapting Qloo's adjacent evidence to a ${durationMinutes}-minute, “${energy}” session in a “${setting}” setting.`,
      },
      {
        stage: 'explain',
        status: qlooExplainability.resultCount > 0 || qlooExplainability.aggregateAvailable ? 'ok' : 'warning',
        detail: qlooExplainability.resultCount > 0
          ? `Attached a visible why-it-fits rationale to every activity. Qloo also returned per-result explainability metadata on ${qlooExplainability.resultCount} taste result(s)${qlooExplainability.aggregateAvailable ? ' plus aggregate explainability metadata.' : '.'}`
          : qlooExplainability.aggregateAvailable
            ? 'Attached a visible why-it-fits rationale to every activity. Qloo also returned aggregate explainability metadata for the result set.'
            : 'Attached a visible why-it-fits rationale to every activity. Qloo explainability was requested, but this response did not include attribution metadata.',
      },
    ],
  };
}