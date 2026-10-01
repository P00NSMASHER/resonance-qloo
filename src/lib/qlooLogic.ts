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

export type ResolvedAnchor = { query: string; name: string; entityId: string };
export type Affinity = { label: string; score: number | null; rank: number };
export type PlanItem = { title: string; duration: string; action: string; why: string };

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

export function planFromTags(tags: Affinity[], energy: string, setting: string): PlanItem[] {
  const names = tags.map(x => x.label);
  const [a='familiar favorites', b='warm nostalgia', c='shared storytelling', d='comforting ritual'] = names;
  const energyLine =
    energy === 'active' ? 'invite movement, clapping, or choosing between options' :
    energy === 'social' ? 'invite easy back-and-forth conversation' :
    'keep the pace gentle and low-pressure';
  const settingLine =
    setting === 'one-on-one' ? 'for one person and one companion' :
    setting === 'community' ? 'for a room where people can join or step out freely' :
    'for a small group with room for individual responses';

  return [
    { title:'Opening cue', duration:'10 min', action:`Start with music, imagery, or a short prompt shaped around “${a}.” ${energyLine}.`, why:`Qloo surfaced “${a}” near the top of the cross-category evidence from the cultural anchors.` },
    { title:'Story bridge', duration:'15 min', action:`Use “${b}” as the bridge into a film scene, photo, lyric, or memory prompt. Keep it ${settingLine}.`, why:`“${b}” gives the agent a Qloo-grounded next step instead of a generic nostalgia prompt.` },
    { title:'Shared choice', duration:'15 min', action:`Offer two or three simple choices connected to “${c}” and let participants steer the next activity.`, why:`“${c}” extends the known tastes into a related domain while preserving participant choice.` },
    { title:'Closing ritual', duration:'10 min', action:`Close with a snack, sensory cue, or conversation card inspired by “${d},” then ask what should return next time.`, why:`“${d}” provides another Qloo-ranked adjacent signal so the plan ends in the same cultural neighborhood it started in.` }
  ];
}