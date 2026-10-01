import { anchorTypeLabelFromUrn } from './anchorTypes';

export type ExportableSession = {
  summary: string;
  resolvedAnchors: { name:string; requestedTypeUrn?:string }[];
  affinities: { label:string; score:number|null; rank:number }[];
  plan: { title:string; duration:string; action:string; why:string }[];
  provenance?: { generatedAt?: string };
  evidence?: {
    evidenceBasis?: 'normalized-score' | 'ranked-order';
  };
};

export function formatSessionText(session: ExportableSession, source: 'live' | 'demo') {
  const generatedAt = source === 'live' ? session.provenance?.generatedAt : undefined;
  const lines = [
    'Resonance session',
    source === 'live' ? 'Source: Live Qloo' : 'Source: Illustrative demo — not live Qloo data',
    ...(generatedAt ? [`Generated: ${generatedAt}`] : []),
    ...(source === 'live' && session.evidence?.evidenceBasis
      ? [`Evidence basis: ${session.evidence.evidenceBasis === 'normalized-score' ? 'Qloo numeric scores' : 'Qloo ranked result order'}`]
      : []),
    '',
    session.summary,
    '',
    'Resolved anchors:',
    ...session.resolvedAnchors.map(item => {
      const category = anchorTypeLabelFromUrn(item.requestedTypeUrn);
      return `- ${item.name}${category ? ` [${category}]` : ''}`;
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
