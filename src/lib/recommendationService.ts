import { extractAffinities, extractResolved, type ResolvedAnchor } from './qlooLogic';
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
      return found ? { ...found, requestedTypeUrn: anchor.typeUrn } : null;
    }),
  );
  const resolved = resolvedCandidates.filter(
    (item): item is ResolvedAnchor => item !== null,
  );

  if (resolved.length < 2) {
    throw new Error('QLOO_EVIDENCE_TOO_SPARSE');
  }

  const affinities = extractAffinities(
    await gateway.tasteAnalysis(resolved.map(x => x.entityId))
  );
  const session = orchestrateSession(resolved, affinities, input.energy, input.setting);

  return {
    summary: `Built from ${resolved.length} resolved Qloo entities and ${affinities.length} cross-category affinity signals.`,
    resolvedAnchors: resolved,
    affinities,
    plan: session.plan,
    agentTrace: session.agentTrace,
    evidence: session.evidence,
  };
}
