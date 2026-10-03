import type { RecommendationRequestContext } from './recommendationContext';

export type AnchorOnlyBaselineItem = {
  anchor: string;
  typeUrn?: string;
  action: string;
};

export type QlooDelta = {
  baseline: AnchorOnlyBaselineItem[];
  inputAnchorCount: number;
  returnedSignalCount: number;
  selectedSignalCount: number;
  activitiesInfluencedCount: number;
  selectedSignalsNotNamedInInputs: string[];
};

function normalized(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function literalBaselineAction(query: string, typeUrn?: string) {
  switch (typeUrn) {
    case 'urn:entity:artist':
      return `Use “${query}” directly: play or discuss something familiar from that artist and invite a response.`;
    case 'urn:entity:movie':
    case 'urn:entity:tv_show':
      return `Use “${query}” directly: revisit a scene, image, character, or memory connected to it.`;
    case 'urn:entity:book':
      return `Use “${query}” directly: revisit a passage, cover, character, or memory connected to the book.`;
    case 'urn:entity:place':
    case 'urn:entity:destination':
      return `Use “${query}” directly: look at imagery from the place and invite travel or place-based memories.`;
    case 'urn:entity:brand':
      return `Use “${query}” directly: use the familiar brand, object, or design as a concrete conversation prompt.`;
    case 'urn:entity:podcast':
      return `Use “${query}” directly: discuss a familiar episode, host, or topic already associated with it.`;
    case 'urn:entity:videogame':
      return `Use “${query}” directly: revisit a familiar game element, character, or play memory.`;
    default:
      return `Use “${query}” directly as a familiar conversation, image, music, food, or sensory prompt.`;
  }
}

export function buildAnchorOnlyBaseline(context: RecommendationRequestContext) {
  return context.anchors.map(anchor => ({
    anchor:anchor.query,
    ...(anchor.typeUrn ? { typeUrn:anchor.typeUrn } : {}),
    action:literalBaselineAction(anchor.query, anchor.typeUrn),
  }));
}

export function buildQlooDelta(
  context: RecommendationRequestContext,
  returnedSignals: { label:string }[],
  selectedSignalLabels: string[],
  plan: { affinityLabel?:string }[],
): QlooDelta {
  const normalizedInputs = context.anchors.map(anchor => normalized(anchor.query));
  const selectedSignalsNotNamedInInputs = selectedSignalLabels.filter(label => {
    const normalizedLabel = normalized(label);
    return !normalizedInputs.some(input =>
      input === normalizedLabel ||
      input.includes(normalizedLabel) ||
      normalizedLabel.includes(input)
    );
  });
  const selectedSet = new Set(selectedSignalLabels);
  const activitiesInfluencedCount = plan.filter(item =>
    Boolean(item.affinityLabel && selectedSet.has(item.affinityLabel))
  ).length;

  return {
    baseline:buildAnchorOnlyBaseline(context),
    inputAnchorCount:context.anchors.length,
    returnedSignalCount:returnedSignals.length,
    selectedSignalCount:selectedSignalLabels.length,
    activitiesInfluencedCount,
    selectedSignalsNotNamedInInputs,
  };
}
