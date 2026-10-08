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

function normalizedEntityName(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function resolutionMatch(query: string, name: string): ResolvedAnchor['resolutionMatch'] {
  return normalizedEntityName(query) === normalizedEntityName(name)
    ? 'exact-name'
    : 'top-result';
}

export type ResolvedAnchor = {
  query: string;
  name: string;
  entityId: string;
  requestedTypeUrn?: string;
  resolutionMatch: 'exact-name' | 'top-result';
};
export type Affinity = { label: string; score: number | null; rank: number };
export type PlanItem = {
  title: string;
  duration: string;
  action: string;
  why: string;
  anchorName?: string;
  affinityLabel: string;
};
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

function qlooTagRows(payload: unknown) {
  if (payload && typeof payload === 'object') {
    const results = (payload as AnyObject).results;
    if (results && typeof results === 'object') {
      const tags = (results as AnyObject).tags;
      if (Array.isArray(tags)) return tags;
    }
  }
  return findArray(payload, ['tags', 'results', 'data']);
}

export function extractResolved(query: string, payload: unknown): ResolvedAnchor | null {
  const rows = findArray(payload, ['results', 'entities', 'data']);
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as AnyObject;
    const candidate = firstString(rec, ['entity_id', 'entityId', 'id', 'urn']);
    const name = firstString(rec, ['name', 'title', 'label']);
    if (candidate && looksLikeEntityId(candidate)) {
      const resolvedName = name || query;
      return {
        query,
        name: resolvedName,
        entityId: candidate,
        resolutionMatch: name ? resolutionMatch(query, resolvedName) : 'top-result',
      };
    }

    for (const value of Object.values(rec)) {
      if (!value || typeof value !== 'object') continue;
      const nested = value as AnyObject;
      const nestedId = firstString(nested, ['entity_id', 'entityId', 'id', 'urn']);
      if (nestedId && looksLikeEntityId(nestedId)) {
        const nestedName = firstString(nested, ['name', 'title', 'label']) || name;
        const resolvedName = nestedName || query;
        return {
          query,
          name: resolvedName,
          entityId: nestedId,
          resolutionMatch: nestedName ? resolutionMatch(query, resolvedName) : 'top-result',
        };
      }
    }
  }
  return null;
}

export function extractAffinities(payload: unknown): Affinity[] {
  const rows = qlooTagRows(payload);
  const items: Affinity[] = [];

  for (const [rowIndex, row] of rows.entries()) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as AnyObject;
    const label = firstString(rec, ['name', 'label', 'title', 'tag']);
    if (!label || items.some(x => x.label.toLowerCase() === label.toLowerCase())) continue;

    items.push({
      label,
      score: affinityScore(rec),
      rank: rowIndex + 1,
    });
    if (items.length >= 8) break;
  }
  return items;
}

// Interleave genuinely returned Qloo signals from independently ranked tag
// families. Deduplicate normalized labels and retain original numeric scores,
// but do not treat scores from different families as one global leaderboard.
export function balanceGenreAffinities(groups: Affinity[][]): Affinity[] {
  const result: Affinity[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(0, ...groups.map(group => group.length));
  for (let index = 0; index < maxLength; index++) {
    for (const group of groups) {
      const item = group[index];
      if (!item) continue;
      const label = item.label.trim();
      const identity = label.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
      if (!identity || seen.has(identity)) continue;
      seen.add(identity);
      result.push({ label, score:item.score, rank:result.length + 1 });
    }
  }
  return result;
}

export function extractExplainabilitySummary(payload: unknown): QlooExplainabilitySummary {
  const rows = qlooTagRows(payload);
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

export type SessionArchetype = 'Memory & conversation' | 'Sensory & social' | 'Creative participation';

export function selectSessionArchetype(
  tags: Pick<Affinity,'label'>[],
  energy = 'calm',
  setting = 'small-group',
): SessionArchetype {
  const labels = tags.map(item => item.label.toLocaleLowerCase('en-US').split(/[^a-z0-9]+/).filter(Boolean));
  const score = (terms:string[]) => labels.reduce((sum,tokens) => sum + terms.filter(term => {
    const termTokens = term.split(' ');
    return termTokens.length === 1
      ? tokens.includes(termTokens[0])
      : tokens.join(' ').includes(termTokens.join(' '));
  }).length,0);
  const memory = score(['jazz','swing','oldies','timeless','reporter','history','broadway','vocal','piano','nostalgia','classic']);
  const sensory = score(['food','culinary','restaurant','taste','travel','place','garden','nature','fashion','design','color','scent']);
  const creative = score(['inventive','creative','cultural arts','art','music','dance','joyous','optimism','optimistic','craft']);
  if (sensory > memory && sensory >= creative) return 'Sensory & social';
  if (creative > memory && creative > sensory) return 'Creative participation';
  if (memory > sensory && memory > creative) return 'Memory & conversation';
  if (energy === 'active') return 'Creative participation';
  if (setting === 'community') return 'Sensory & social';
  return 'Memory & conversation';
}

export function planFromTags(
  tags: Affinity[],
  energy: string,
  setting: string,
  anchorNames: string[] = [],
  durationMinutes = 45,
): PlanItem[] {
  const names = tags.map(x => x.label);
  const a = names[0] ?? 'familiar favorites';
  const b = names[1] ?? a;
  const c = names[2] ?? b;
  const d = names[3] ?? c;
  const [firstAnchor, secondAnchor, thirdAnchor, fourthAnchor] = anchorNames;
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
  const archetype = selectSessionArchetype(tags, energy, setting);

  if (archetype === 'Sensory & social') {
    return [
      { title:'Sensory welcome', duration:durations[0], action:firstAnchor ? `Start with “${firstAnchor}” and a concrete sensory cue connected to “${a}”; ${energyLine}.` : `Start with a concrete sensory cue connected to “${a}”; ${energyLine}.`, why:`“${a}” makes the opening tangible rather than purely conversational.`, ...(firstAnchor?{anchorName:firstAnchor}:{}), affinityLabel:a },
      { title:'Taste & place bridge', duration:durations[1], action:secondAnchor ? `Connect “${secondAnchor}” with “${b}” through imagery, food, place, texture, or a simple choice. Keep it ${settingLine}.` : `Use “${b}” to bridge into imagery, food, place, texture, or a simple choice. Keep it ${settingLine}.`, why:`Qloo-ranked “${b}” broadens the familiar input into a sensory/social direction.`, ...(secondAnchor?{anchorName:secondAnchor}:{}), affinityLabel:b },
      { title:'Shared sensory choice', duration:durations[2], action:thirdAnchor ? `Offer two or three sensory or social choices connecting “${thirdAnchor}” with “${c},” and let participants choose the direction.` : `Offer two or three sensory or social choices connected to “${c},” and let participants choose the direction.`, why:`“${c}” supplies adjacent evidence while participant choice keeps the activity human-led.`, ...(thirdAnchor?{anchorName:thirdAnchor}:{}), affinityLabel:c },
      { title:'Comfort close', duration:durations[3], action:fourthAnchor ? `Reconnect “${fourthAnchor}” with “${d}” through a comfortable sensory cue or conversation prompt, then ask what should return next time.` : `Close with a comfortable sensory cue or conversation prompt inspired by “${d},” then ask what should return next time.`, why:`“${d}” keeps the closing step inside the Qloo-grounded sensory neighborhood.`, ...(fourthAnchor?{anchorName:fourthAnchor}:{}), affinityLabel:d },
    ];
  }

  if (archetype === 'Creative participation') {
    return [
      { title:'Creative spark', duration:durations[0], action:firstAnchor ? `Start from “${firstAnchor}” and use “${a}” as a prompt to notice, choose, hum, sketch, gesture, or respond; ${energyLine}.` : `Use “${a}” as a prompt to notice, choose, hum, sketch, gesture, or respond; ${energyLine}.`, why:`Qloo-ranked “${a}” turns the familiar input into an active creative starting point.`, ...(firstAnchor?{anchorName:firstAnchor}:{}), affinityLabel:a },
      { title:'Make a connection', duration:durations[1], action:secondAnchor ? `Bridge “${secondAnchor}” into “${b}” with a simple create-or-choose prompt. Keep it ${settingLine}.` : `Use “${b}” for a simple create-or-choose prompt. Keep it ${settingLine}.`, why:`“${b}” provides an adjacent Qloo signal for participation rather than passive recall.`, ...(secondAnchor?{anchorName:secondAnchor}:{}), affinityLabel:b },
      { title:'Participant-led creation', duration:durations[2], action:thirdAnchor ? `Let participants shape a small shared creation that connects “${thirdAnchor}” with “${c}.”` : `Let participants shape a small shared creation around “${c}.”`, why:`“${c}” extends the taste evidence while participants determine the actual creative output.`, ...(thirdAnchor?{anchorName:thirdAnchor}:{}), affinityLabel:c },
      { title:'Show & choose next', duration:durations[3], action:fourthAnchor ? `Close by connecting “${fourthAnchor}” with “${d},” sharing what was made or chosen, and deciding what to revisit next time.` : `Close with “${d},” share what was made or chosen, and decide what to revisit next time.`, why:`“${d}” grounds the close in Qloo evidence while returning control to the participants.`, ...(fourthAnchor?{anchorName:fourthAnchor}:{}), affinityLabel:d },
    ];
  }

  return [
    { title:'Familiar opening', duration:durations[0], action:firstAnchor ? `Start with “${firstAnchor}” as the familiar cue, then branch toward “${a}”; ${energyLine}.` : `Start with music, imagery, or a short prompt shaped around “${a}”; ${energyLine}.`, why:firstAnchor ? `The session starts from “${firstAnchor}” and uses Qloo-ranked “${a}” as adjacent memory/conversation evidence.` : `Qloo surfaced “${a}” near the top of the memory/conversation evidence.`, ...(firstAnchor?{anchorName:firstAnchor}:{}), affinityLabel:a },
    { title:'Memory bridge', duration:durations[1], action:secondAnchor ? `Bridge from “${secondAnchor}” into “${b}” with a scene, photo, lyric, headline, or memory prompt. Keep it ${settingLine}.` : `Use “${b}” as a bridge into a scene, photo, lyric, headline, or memory prompt. Keep it ${settingLine}.`, why:`Qloo-ranked “${b}” provides a specific adjacent bridge instead of a generic nostalgia prompt.`, ...(secondAnchor?{anchorName:secondAnchor}:{}), affinityLabel:b },
    { title:'Conversation choice', duration:durations[2], action:thirdAnchor ? `Offer two or three conversation directions connecting “${thirdAnchor}” with “${c},” and let participants choose.` : `Offer two or three conversation directions connected to “${c},” and let participants choose.`, why:`“${c}” extends the known tastes while preserving participant choice.`, ...(thirdAnchor?{anchorName:thirdAnchor}:{}), affinityLabel:c },
    { title:'Recall & close', duration:durations[3], action:fourthAnchor ? `Reconnect “${fourthAnchor}” with “${d},” invite one final memory or preference, then ask what should return next time.` : `Use “${d}” for one final memory or preference prompt, then ask what should return next time.`, why:`“${d}” keeps the close inside the Qloo-grounded memory/conversation neighborhood.`, ...(fourthAnchor?{anchorName:fourthAnchor}:{}), affinityLabel:d },
  ];
}

