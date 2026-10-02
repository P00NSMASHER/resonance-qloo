import { extractAffinities, extractExplainabilitySummary, extractResolved, type ResolvedAnchor } from './qlooLogic';
import { orchestrateSession } from './agentPlanner';
import { qlooEntityIdentity } from './qlooEntityIdentity';
import { recommendationRequestContext, type RecommendationRequestContext } from './recommendationContext';

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
  confirmedEntityIds?: string[];
};

export class ResolutionReviewRequiredError extends Error {
  constructor(
    public readonly resolvedAnchors: ResolvedAnchor[],
    public readonly requestContext: RecommendationRequestContext,
  ) {
    super('QLOO_RESOLUTION_REVIEW_REQUIRED');
  }
}

export async function buildRecommendation(
  gateway: RecommendationGateway,
  input: RecommendationInput,
) {
  const requestContext = recommendationRequestContext(input);
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
  const seenEntityIds = new Set<string>();
  for (const item of resolvedCandidates) {
    if (!item) continue;
    const identity = qlooEntityIdentity(item.entityId);
    if (seenEntityIds.has(identity)) continue;
    seenEntityIds.add(identity);
    resolved.push(item);
  }

  if (resolved.length < 2) {
    throw new Error('QLOO_EVIDENCE_TOO_SPARSE');
  }

  const confirmedEntityIds = new Set((input.confirmedEntityIds ?? []).map(qlooEntityIdentity));
  const unresolvedReview = resolved.filter(
    item => item.resolutionMatch === 'top-result' && !confirmedEntityIds.has(qlooEntityIdentity(item.entityId)),
  );
  if (unresolvedReview.length) {
    throw new ResolutionReviewRequiredError(resolved, requestContext);
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

  const topResultCount = session.evidence.topResultResolutionCount;
  const reviewSuffix = topResultCount > 0
    ? ` ${topResultCount} Qloo top-result match(es) were explicitly confirmed before taste analysis.`
    : '';
  const agentTrace = session.agentTrace.map(step =>
    step.stage === 'resolve' && topResultCount > 0
      ? {
          ...step,
          status:'ok' as const,
          detail:`Resolved ${resolved.length} cultural anchors into Qloo-backed entity evidence; ${session.evidence.exactResolutionCount} exact-name match(es), ${topResultCount} explicitly confirmed Qloo top-result match(es), and ${session.evidence.categoryHintCount} explicit category hint(s).`,
        }
      : step
  );

  return {
    requestContext,
    summary: `Built from ${resolved.length} resolved Qloo entities and ${affinities.length} cross-category affinity signals.${reviewSuffix}`,
    resolvedAnchors: resolved,
    affinities,
    plan: session.plan,
    agentTrace,
    evidence: session.evidence,
  };
}
