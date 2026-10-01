import { extractAffinities, extractResolved } from './qlooLogic';
import { orchestrateSession } from './agentPlanner';

export type RecommendationGateway = {
  search(query: string): Promise<unknown>;
  tasteAnalysis(entityIds: string[]): Promise<unknown>;
};

export type RecommendationInput = {
  anchors: string[];
  energy: string;
  setting: string;
};

export async function buildRecommendation(
  gateway: RecommendationGateway,
  input: RecommendationInput,
) {
  const resolved = [];
  for (const query of input.anchors) {
    const found = extractResolved(query, await gateway.search(query));
    if (found) resolved.push(found);
  }

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
