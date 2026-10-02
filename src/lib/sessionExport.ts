import { anchorTypeLabelFromUrn } from './anchorTypes';

export type ExportableSession = {
  summary: string;
  resolvedAnchors: { query?:string; name:string; entityId?:string; requestedTypeUrn?:string }[];
  affinities: { label:string; score:number|null; rank:number }[];
  plan: { title:string; duration:string; action:string; why:string; anchorName?:string; affinityLabel?:string }[];
  agentTrace?: { stage:string; status?:'ok'|'warning'; detail:string }[];
  provenance?: { generatedAt?: string };
  evidence?: {
    evidenceBasis?: 'normalized-score' | 'ranked-order';
    meanNormalizedScore?: number | null;
    explainabilityResultCount?: number;
    aggregateExplainabilityAvailable?: boolean;
    resolvedAnchorCount?: number;
    categoryHintCount?: number;
    selectedAffinityCount?: number;
    selectedAffinityLabels?: string[];
    sessionDurationMinutes?: number;
    energy?: string;
    setting?: string;
  };
};

export function formatSessionText(session: ExportableSession, source: 'live' | 'demo') {
  const generatedAt = source === 'live' ? session.provenance?.generatedAt : undefined;
  const selectedAffinitySequence = session.evidence?.selectedAffinityLabels?.length
    ? session.evidence.selectedAffinityLabels
    : session.affinities.slice(0, session.evidence?.selectedAffinityCount ?? 0).map(item => item.label);
  const selectedAffinityOrder = new Map(
    selectedAffinitySequence.map((label,index) => [label,index + 1]),
  );
  const lines = [
    'Resonance session',
    source === 'live' ? 'Source: Live Qloo' : 'Source: Illustrative demo — not live Qloo data',
    'Scope: cultural engagement guidance, not medical advice',
    'Human review: facilitator may accept, modify, reorder, or reject any suggestion',
    ...(generatedAt ? [`Generated: ${generatedAt}`] : []),
    ...(source === 'live' && session.evidence?.evidenceBasis
      ? [`Evidence basis: ${session.evidence.evidenceBasis === 'normalized-score' ? 'Qloo numeric scores' : 'Qloo ranked result order'}`]
      : []),
    ...(source === 'live' && session.evidence?.meanNormalizedScore !== undefined && session.evidence.meanNormalizedScore !== null
      ? [`Mean selected Qloo score: ${Math.round(session.evidence.meanNormalizedScore * 100)}%`]
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
    ...(source === 'live' && session.evidence?.selectedAffinityCount !== undefined
      ? [`Selection evidence: ${session.evidence.selectedAffinityCount} of ${session.affinities.length} affinity signal(s) selected for the plan`]
      : []),
    ...(source === 'live' && selectedAffinitySequence.length
      ? [`Selected Qloo signals: ${selectedAffinitySequence.map((label,index) => `#${index + 1} ${label}`).join(' | ')}`]
      : []),
    ...(source === 'live' && session.evidence?.sessionDurationMinutes !== undefined
      ? [`Session target: ${session.evidence.sessionDurationMinutes} minutes`]
      : []),
    ...(source === 'live' && (session.evidence?.energy || session.evidence?.setting)
      ? [`Session context: energy=${session.evidence?.energy ?? 'unspecified'}; setting=${session.evidence?.setting ?? 'unspecified'}`]
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
    source === 'live' ? 'Taste evidence:' : 'Illustrative taste evidence:',
    ...session.affinities.map(item => {
      const signalNumber = selectedAffinityOrder.get(item.label);
      const role = signalNumber
        ? source === 'live' ? `selected Qloo signal #${signalNumber}` : `example plan signal #${signalNumber}`
        : source === 'live' ? 'additional Qloo evidence' : 'additional example evidence';
      return `- [${role}] ${item.label}: ${item.score === null ? `Rank #${item.rank}` : `${Math.round(item.score * 100)}%`}`;
    }),
    ...(session.agentTrace?.length ? [
      '',
      source === 'live' ? 'Agent decision trace:' : 'Illustrative agent decision trace:',
      ...session.agentTrace.map(step => `- ${step.stage}${step.status ? ` [${step.status}]` : ''}: ${step.detail}`),
    ] : []),
    '',
    'Session plan:',
    ...session.plan.flatMap((item, index) => {
      const signalNumber = item.affinityLabel ? selectedAffinityOrder.get(item.affinityLabel) : undefined;
      return [
        `${index + 1}. ${item.title} (${item.duration})`,
        ...(item.affinityLabel
          ? [`   Bridge${signalNumber ? ` [${source === 'live' ? 'Qloo' : 'example'} signal #${signalNumber}]` : ''}: ${item.anchorName ? `${item.anchorName} -> ${item.affinityLabel}` : item.affinityLabel}`]
          : []),
        `   ${item.action}`,
        `   Why it fits: ${item.why}`,
      ];
    }),
  ];
  return lines.join('\n');
}
