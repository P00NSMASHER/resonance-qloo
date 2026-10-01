export type ExportableSession = {
  summary: string;
  resolvedAnchors: { name:string }[];
  affinities: { label:string; score:number|null; rank:number }[];
  plan: { title:string; duration:string; action:string; why:string }[];
};

export function formatSessionText(session: ExportableSession, source: 'live' | 'demo') {
  const lines = [
    'Resonance session',
    source === 'live' ? 'Source: Live Qloo' : 'Source: Illustrative demo — not live Qloo data',
    '',
    session.summary,
    '',
    'Resolved anchors:',
    ...session.resolvedAnchors.map(item => `- ${item.name}`),
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
