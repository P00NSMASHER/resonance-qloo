type AnyObject = Record<string, unknown>;

function findArray(obj: unknown, keys: string[]): unknown[] {
  if (!obj || typeof obj !== 'object') return [];
  const record = obj as AnyObject;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const found = findArray(value, keys);
      if (found.length) return found;
    }
  }
  return [];
}

function firstString(record: AnyObject, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function firstNumeric(record: AnyObject, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function affinityScore(record: AnyObject): number | null {
  const direct = firstNumeric(record, ['affinity', 'score', 'weight']);
  if (direct !== null) return Math.max(0, Math.min(1, direct));

  for (const key of ['query', 'metrics', 'metadata']) {
    const nested = record[key];
    if (nested && typeof nested === 'object') {
      const value = firstNumeric(nested as AnyObject, ['affinity', 'score', 'weight']);
      if (value !== null) return Math.max(0, Math.min(1, value));
    }
  }
  return null;
}

function looksLikeEntityId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    || value.startsWith('urn:entity:');
}

export type ResolvedAnchor = { query: string; name: string; entityId: string; requestedTypeUrn?: string };
export type Affinity = { label: string; score: number | null; rank: number };
export type PlanItem = { title: string; duration: string; action: string; why: string };
export type QlooExplainabilitySummary = {
  resultCount: number;
  aggregateAvailable: boolean;
};

function hasObjectContent(value: unknown) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Object.keys(value as Record<string, unknown>).length > 0
  );
}

export function extractResolved(query: string, payload: unknown): ResolvedAnchor | null {
  const rows = findArray(payload, ['results', 'entities', 'data']);
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as AnyObject;
    const candidate = firstString(rec, ['entity_id', 'entityId', 'id', 'urn']);
    const name = firstString(rec, ['name', 'title', 'label']);
    if (candidate && looksLikeEntityId(candidate)) {
      return { query, name: name || query, entityId: candidate };
    }

    for (const value of Object.values(rec)) {
      if (!value || typeof value !== 'object') continue;
      const nested = value as AnyObject;
      const nestedId = firstString(nested, ['entity_id', 'entityId', 'id', 'urn']);
      if (nestedId && looksLikeEntityId(nestedId)) {
        return {
          query,
          name: firstString(nested, ['name', 'title', 'label']) || name || query,
          entityId: nestedId,
        };
      }
    }
  }
  return null;
}

export function extractAffinities(payload: unknown): Affinity[] {
  const rows = findArray(payload, ['tags', 'results', 'data']);
  const items: Affinity[] = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as AnyObject;
    const label = firstString(rec, ['name', 'label', 'title', 'tag']);
    if (!label || items.some(x => x.label.toLowerCase() === label.toLowerCase())) continue;

    items.push({
      label,
      score: affinityScore(rec),
      rank: items.length + 1,
    });
    if (items.length >= 8) break;
  }
  return items;
}

export function extractExplainabilitySummary(payload: unknown): QlooExplainabilitySummary {
  const rows = findArray(payload, ['tags', 'results', 'data']);
  let resultCount = 0;

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const query = (row as AnyObject).query;
    if (!query || typeof query !== 'object') continue;
    if (hasObjectContent((query as AnyObject).explainability)) resultCount += 1;
  }

  let aggregateAvailable = false;
  if (payload && typeof payload === 'object') {
    const query = (payload as AnyObject).query;
    if (query && typeof query === 'object') {
      aggregateAvailable = hasObjectContent((query as AnyObject).explainability);
    }
  }

  return { resultCount, aggregateAvailable };
}

export function planFromTags(
  tags: Affinity[],
  energy: string,
  setting: string,
  anchorNames: string[] = [],
  durationMinutes = 45,
): PlanItem[] {
  const names = tags.map(x => x.label);
  const [a='familiar favorites', b='warm nostalgia', c='shared storytelling', d='comforting ritual'] = names;
  const [firstAnchor, secondAnchor, thirdAnchor] = anchorNames;
  const durations = durationMinutes === 30
    ? ['5 min','10 min','10 min','5 min']
    : durationMinutes === 60
      ? ['10 min','20 min','20 min','10 min']
      : ['10 min','10 min','15 min','10 min'];
  const energyLine =
    energy === 'active' ? 'invite movement, clapping, or choosing between options' :
    energy === 'social' ? 'invite easy back-and-forth conversation' :
    'keep the pace gentle and low-pressure';
  const settingLine =
    setting === 'one-on-one' ? 'for one person and one companion' :
    setting === 'community' ? 'for a room where people can join or step out freely' :
    'for a small group with room for individual responses';

  return [
    firstAnchor
      ? {
          title:'Opening cue',
          duration:durations[0],
          action:`Start with “${firstAnchor}” as the familiar cue, then branch toward “${a}.” ${energyLine}.`,
          why:`The session starts from the supplied favorite “${firstAnchor}” and uses Qloo-ranked “${a}” as adjacent cultural evidence.`,
        }
      : {
          title:'Opening cue',
          duration:durations[0],
          action:`Start with music, imagery, or a short prompt shaped around “${a}.” ${energyLine}.`,
          why:`Qloo surfaced “${a}” near the top of the cross-category evidence from the cultural anchors.`,
        },
    secondAnchor
      ? {
          title:'Story bridge',
          duration:durations[1],
          action:`Bridge from “${secondAnchor}” into “${b}” with a film scene, photo, lyric, or memory prompt. Keep it ${settingLine}.`,
          why:`“${secondAnchor}” is a supplied favorite; Qloo-ranked “${b}” provides the adjacent cultural bridge instead of a generic nostalgia prompt.`,
        }
      : {
          title:'Story bridge',
          duration:durations[1],
          action:`Use “${b}” as the bridge into a film scene, photo, lyric, or memory prompt. Keep it ${settingLine}.`,
          why:`“${b}” gives the agent a Qloo-grounded next step instead of a generic nostalgia prompt.`,
        },
    thirdAnchor
      ? {
          title:'Shared choice',
          duration:durations[2],
          action:`Offer two or three simple choices that connect “${thirdAnchor}” with “${c},” and let participants steer the next activity.`,
          why:`The known favorite “${thirdAnchor}” stays visible while “${c}” extends it into a Qloo-ranked adjacent domain.`,
        }
      : {
          title:'Shared choice',
          duration:durations[2],
          action:`Offer two or three simple choices connected to “${c}” and let participants steer the next activity.`,
          why:`“${c}” extends the known tastes into a related domain while preserving participant choice.`,
        },
    {
      title:'Closing ritual',
      duration:durations[3],
      action:`Close with a snack, sensory cue, or conversation card inspired by “${d},” then ask what should return next time.`,
      why:`“${d}” provides another Qloo-ranked adjacent signal so the plan ends in the same cultural neighborhood it started in.`,
    }
  ];
}