import type { Affinity, PlanItem, ResolvedAnchor } from './qlooLogic';
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
    confidence: number;
    selectedAffinityCount: number;
    resolvedAnchorCount: number;
  };
};

export function orchestrateSession(
  resolvedAnchors: ResolvedAnchor[],
  affinities: Affinity[],
  energy: string,
  setting: string,
): AgentSession {
  if (resolvedAnchors.length < 2) {
    throw new Error('QLOO_EVIDENCE_TOO_SPARSE');
  }

  const ranked = [...affinities]
    .filter(x => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score);

  if (ranked.length < 3) {
    throw new Error('QLOO_EVIDENCE_TOO_SPARSE');
  }

  const selected = ranked.slice(0, 4);
  const confidence = selected.reduce((sum, x) => sum + x.score, 0) / selected.length;

  if (confidence < 0.2) {
    throw new Error('QLOO_EVIDENCE_TOO_WEAK');
  }

  const plan = planFromTags(selected, energy, setting);

  return {
    plan,
    evidence: {
      confidence,
      selectedAffinityCount: selected.length,
      resolvedAnchorCount: resolvedAnchors.length,
    },
    agentTrace: [
      {
        stage: 'resolve',
        status: 'ok',
        detail: `Resolved ${resolvedAnchors.length} cultural anchors into Qloo-backed evidence.`,
      },
      {
        stage: 'evaluate',
        status: confidence >= 0.55 ? 'ok' : 'warning',
        detail: `Selected ${selected.length} highest-signal affinities; mean normalized confidence ${Math.round(confidence * 100)}%.`,
      },
      {
        stage: 'compose',
        status: 'ok',
        detail: `Adapted the session to “${energy}” energy and “${setting}” setting instead of using a one-size-fits-all template.`,
      },
      {
        stage: 'explain',
        status: 'ok',
        detail: 'Attached a visible why-it-fits rationale to every activity so the facilitator can review the evidence path.',
      },
    ],
  };
}
