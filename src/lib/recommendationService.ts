import { extractAffinities, extractExplainabilitySummary, extractResolved, type ResolvedAnchor } from './qlooLogic';
import { orchestrateSession } from './agentPlanner';

export type RecommendationAnchor = {
  query: string;
  typeUrn?: string;
};

export type RecommendationGateway = {
  search(query: string, typeUrn?: string): Promise<unknown>;
  tasteAnalysis(entityIds: string[]): Promise<unknown>;
};

export type RecommendationInput = {
  anchors: RecommendationAnchor[];
  energy: string;
  setting: string;
  durationMinutes?: number;
};

export async function buildRecommendation(
  gateway: RecommendationGateway,
  input: RecommendationInput,
) {
  const resolvedCandidates = await Promise.all(
    input.anchors.map(async (anchor) => {
      const found = extractResolved(
        anchor.query,
        await gateway.search(anchor.query, anchor.typeUrn),
      );
      if (!found) return null;
      return anchor.typeUrn
        ? { ...found, requestedTypeUrn: anchor.typeUrn }
        : found;
    }),
  );
  const resolved: ResolvedAnchor[] = [];
  for (const item of resolvedCandidates) {
    if (item) resolved.push(item);
  }

  if (resolved.length < 2) {
    throw new Error('QLOO_EVIDENCE_TOO_SPARSE');
  }

  const tastePayload = await gateway.tasteAnalysis(resolved.map(x => x.entityId));
  const affinities = extractAffinities(tastePayload);
  const qlooExplainability = extractExplainabilitySummary(tastePayload);
  const session = orchestrateSession(
    resolved,
    affinities,
    input.energy,
    input.setting,
    qlooExplainability,
    input.durationMinutes ?? 45,
  );

  return {
    summary: `Built from ${resolved.length} resolved Qloo entities and ${affinities.length} cross-category affinity signals.`,
    resolvedAnchors: resolved,
    affinities,
    plan: session.plan,
    agentTrace: session.agentTrace,
    evidence: session.evidence,
  };
}
