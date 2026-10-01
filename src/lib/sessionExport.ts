import { anchorTypeLabelFromUrn } from './anchorTypes';

export type ExportableSession = {
  summary: string;
  resolvedAnchors: { query?:string; name:string; entityId?:string; requestedTypeUrn?:string }[];
  affinities: { label:string; score:number|null; rank:number }[];
  plan: { title:string; duration:string; action:string; why:string }[];
  provenance?: { generatedAt?: string };
  evidence?: {
    evidenceBasis?: 'normalized-score' | 'ranked-order';
    explainabilityResultCount?: number;
    aggregateExplainabilityAvailable?: boolean;
    resolvedAnchorCount?: number;
    categoryHintCount?: number;
  };
};

export function formatSessionText(session: ExportableSession, source: 'live' | 'demo') {
  const generatedAt = source === 'live' ? session.provenance?.generatedAt : undefined;
  const lines = [
    'Resonance session',
    source === 'live' ? 'Source: Live Qloo' : 'Source: Illustrative demo — not live Qloo data',
    'Scope: cultural engagement guidance, not medical advice',
    'Human review: facilitator may accept, modify, reorder, or reject any suggestion',
    ...(generatedAt ? [`Generated: ${generatedAt}`] : []),
    ...(source === 'live' && session.evidence?.evidenceBasis
      ? [`Evidence basis: ${session.evidence.evidenceBasis === 'normalized-score' ? 'Qloo numeric scores' : 'Qloo ranked result order'}`]
      : []),
    ...(source === 'live' && (
      session.evidence?.explainabilityResultCount !== undefined ||
      session.evidence?.aggregateExplainabilityAvailable !== undefined
    )
      ? [`Qloo explainability: ${session.evidence?.explainabilityResultCount ?? 0} result(s) with attribution metadata; aggregate metadata ${session.evidence?.aggregateExplainabilityAvailable ? 'present' : 'absent'}`]
      : []),
    ...(source === 'live' && (
      session.evidence?.resolvedAnchorCount !== undefined ||
      session.evidence?.categoryHintCount !== undefined
    )
      ? [`Resolution evidence: ${session.evidence?.resolvedAnchorCount ?? session.resolvedAnchors.length} anchor(s) resolved; ${session.evidence?.categoryHintCount ?? 0} category hint(s) used`]
      : []),
    '',
    session.summary,
    '',
    'Resolved anchors:',
    ...session.resolvedAnchors.map(item => {
      const category = anchorTypeLabelFromUrn(item.requestedTypeUrn);
      const id = source === 'live' && item.entityId ? ` {Qloo ID: ${item.entityId}}` : '';
      const resolution = source === 'live' && item.query && item.query.trim().toLowerCase() !== item.name.trim().toLowerCase()
        ? `${item.query} -> ${item.name}`
        : item.name;
      return `- ${resolution}${category ? ` [${category}]` : ''}${id}`;
    }),
    '',
    'Taste evidence:',
    ...session.affinities.map(item =>
      `- ${item.label}: ${item.score === null ? `Rank #${item.rank}` : `${Math.round(item.score * 100)}%`}`
    ),
    '',
    'Session plan:',
    ...session.plan.flatMap((item, index) => [
      `${index + 1}. ${item.title} (${item.duration})`,
      `   ${item.action}`,
      `   Why it fits: ${item.why}`,
    ]),
  ];
  return lines.join('\n');
}
