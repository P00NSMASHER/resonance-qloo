type AnyObject = Record<string, unknown>;

const QLOO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function findArray(obj: unknown, keys: string[]): unknown[] {
  if (!obj || typeof obj !== "object") return [];
  const record = obj as AnyObject;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const found = findArray(value, keys);
      if (found.length) return found;
    }
  }
  return [];
}

function firstString(record: AnyObject, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstNumeric(record: AnyObject, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function normalizedEntityName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function entityIdentity(value: string) {
  const trimmed = value.trim();
  return QLOO_UUID.test(trimmed) ? trimmed.toLocaleLowerCase("en-US") : trimmed;
}

function affinityScore(record: AnyObject): number | null {
  const direct = firstNumeric(record, ["affinity", "score", "weight"]);
  if (direct !== null) return Math.max(0, Math.min(1, direct));
  for (const key of ["query", "metrics", "metadata"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      const value = firstNumeric(nested as AnyObject, ["affinity", "score", "weight"]);
      if (value !== null) return Math.max(0, Math.min(1, value));
    }
  }
  return null;
}

function tagRows(payload: unknown) {
  if (payload && typeof payload === "object") {
    const results = (payload as AnyObject).results;
    if (results && typeof results === "object") {
      const tags = (results as AnyObject).tags;
      if (Array.isArray(tags)) return tags;
    }
  }
  return findArray(payload, ["tags", "results", "data"]);
}

function hasObjectContent(value: unknown) {
  return Boolean(value && typeof value === "object" && Object.keys(value as AnyObject).length);
}

function anchorTypeUrn(type?: string) {
  const map: Record<string, string> = {
    artist:"urn:entity:artist",
    movie:"urn:entity:movie",
    book:"urn:entity:book",
    brand:"urn:entity:brand",
    destination:"urn:entity:destination",
    place:"urn:entity:place",
    podcast:"urn:entity:podcast",
    tv_show:"urn:entity:tv_show",
    videogame:"urn:entity:videogame",
  };
  return type && type !== "any" ? map[type] : undefined;
}

export const qlooSessionLogic = {
  contractVersion:"2026-10-02.review-origin-v1",
  apiOrigin:"https://hackathon.api.qloo.com",

  entityIdentity,
  anchorTypeUrn,

  normalizeQuery(value: string) {
    return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  },

  extractResolved(query: string, payload: unknown, requestedTypeUrn?: string) {
    const rows = findArray(payload, ["results", "entities", "data"]);
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const rec = row as AnyObject;
      const candidate = firstString(rec, ["entity_id", "entityId", "id", "urn"]);
      const name = firstString(rec, ["name", "title", "label"]);
      if (candidate && (QLOO_UUID.test(candidate) || candidate.startsWith("urn:entity:"))) {
        const resolvedName = name || query;
        return {
          query,
          name:resolvedName,
          entityId:candidate,
          urn:candidate,
          ...(requestedTypeUrn ? { requestedTypeUrn } : {}),
          resolutionMatch:normalizedEntityName(query) === normalizedEntityName(resolvedName) ? "exact-name" as const : "top-result" as const,
        };
      }
      for (const value of Object.values(rec)) {
        if (!value || typeof value !== "object") continue;
        const nested = value as AnyObject;
        const nestedId = firstString(nested, ["entity_id", "entityId", "id", "urn"]);
        if (nestedId && (QLOO_UUID.test(nestedId) || nestedId.startsWith("urn:entity:"))) {
          const resolvedName = firstString(nested, ["name", "title", "label"]) || name || query;
          return {
            query,
            name:resolvedName,
            entityId:nestedId,
            urn:nestedId,
            ...(requestedTypeUrn ? { requestedTypeUrn } : {}),
            resolutionMatch:normalizedEntityName(query) === normalizedEntityName(resolvedName) ? "exact-name" as const : "top-result" as const,
          };
        }
      }
    }
    return null;
  },

  extractAffinities(payload: unknown) {
    const rows = tagRows(payload);
    const items: { label:string; score:number|null; rank:number }[] = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const rec = row as AnyObject;
      const label = firstString(rec, ["name", "label", "title", "tag"]);
      if (!label || items.some(item => item.label.toLocaleLowerCase("en-US") === label.toLocaleLowerCase("en-US"))) continue;
      items.push({ label, score:affinityScore(rec), rank:items.length + 1 });
      if (items.length >= 8) break;
    }
    return items;
  },

  extractExplainabilitySummary(payload: unknown) {
    const rows = tagRows(payload);
    let resultCount = 0;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const query = (row as AnyObject).query;
      if (query && typeof query === "object" && hasObjectContent((query as AnyObject).explainability)) resultCount += 1;
    }
    let aggregateAvailable = false;
    if (payload && typeof payload === "object") {
      const query = (payload as AnyObject).query;
      aggregateAvailable = Boolean(query && typeof query === "object" && hasObjectContent((query as AnyObject).explainability));
    }
    return { resultCount, aggregateAvailable };
  },

  selectAffinities(affinities: { label:string; score:number|null; rank:number }[]) {
    const scored = affinities
      .filter((item): item is { label:string; score:number; rank:number } => item.score !== null && Number.isFinite(item.score))
      .sort((left,right) => right.score - left.score);
    const usingScores = scored.length >= 3;
    const selected = (usingScores ? scored : [...affinities].sort((left,right) => left.rank - right.rank)).slice(0,4);
    const meanNormalizedScore = usingScores
      ? selected.reduce((sum,item) => sum + (item.score ?? 0),0) / selected.length
      : null;
    return {
      selected,
      evidenceBasis:usingScores ? "normalized-score" as const : "ranked-order" as const,
      meanNormalizedScore,
    };
  },

  planFromTags(
    tags: { label:string; score:number|null; rank:number }[],
    energy: string,
    setting: string,
    anchorNames: string[] = [],
    durationMinutes = 45,
  ) {
    const names = tags.map(item => item.label);
    const a = names[0] ?? "familiar favorites";
    const b = names[1] ?? a;
    const c = names[2] ?? b;
    const d = names[3] ?? c;
    const [firstAnchor, secondAnchor, thirdAnchor, fourthAnchor] = anchorNames;
    const durations = durationMinutes === 30
      ? ["5 min","10 min","10 min","5 min"]
      : durationMinutes === 60
        ? ["10 min","20 min","20 min","10 min"]
        : ["10 min","10 min","15 min","10 min"];
    const energyLine =
      energy === "active" ? "invite movement, clapping, or choosing between options" :
      energy === "social" ? "invite easy back-and-forth conversation" :
      "keep the pace gentle and low-pressure";
    const settingLine =
      setting === "one-on-one" ? "for one person and one companion" :
      setting === "community" ? "for a room where people can join or step out freely" :
      "for a small group with room for individual responses";

    return [
      {
        title:"Opening cue", duration:durations[0],
        action:firstAnchor ? `Start with “${firstAnchor}” as the familiar cue, then branch toward “${a}.” ${energyLine}.` : `Start with music, imagery, or a short prompt shaped around “${a}.” ${energyLine}.`,
        why:firstAnchor ? `The session starts from the supplied favorite “${firstAnchor}” and uses Qloo-ranked “${a}” as adjacent cultural evidence.` : `Qloo surfaced “${a}” near the top of the cross-category evidence from the cultural anchors.`,
        ...(firstAnchor ? { anchorName:firstAnchor } : {}), affinityLabel:a,
      },
      {
        title:"Story bridge", duration:durations[1],
        action:secondAnchor ? `Bridge from “${secondAnchor}” into “${b}” with a film scene, photo, lyric, or memory prompt. Keep it ${settingLine}.` : `Use “${b}” as the bridge into a film scene, photo, lyric, or memory prompt. Keep it ${settingLine}.`,
        why:secondAnchor ? `“${secondAnchor}” is a supplied favorite; Qloo-ranked “${b}” provides the adjacent cultural bridge instead of a generic nostalgia prompt.` : `“${b}” gives the agent a Qloo-grounded next step instead of a generic nostalgia prompt.`,
        ...(secondAnchor ? { anchorName:secondAnchor } : {}), affinityLabel:b,
      },
      {
        title:"Shared choice", duration:durations[2],
        action:thirdAnchor ? `Offer two or three simple choices that connect “${thirdAnchor}” with “${c},” and let participants steer the next activity.` : `Offer two or three simple choices connected to “${c}” and let participants steer the next activity.`,
        why:thirdAnchor ? `The known favorite “${thirdAnchor}” stays visible while “${c}” extends it into a Qloo-ranked adjacent domain.` : `“${c}” extends the known tastes into a related domain while preserving participant choice.`,
        ...(thirdAnchor ? { anchorName:thirdAnchor } : {}), affinityLabel:c,
      },
      {
        title:"Closing ritual", duration:durations[3],
        action:fourthAnchor ? `Close by reconnecting “${fourthAnchor}” with “${d}” through a snack, sensory cue, or conversation card, then ask what should return next time.` : `Close with a snack, sensory cue, or conversation card inspired by “${d},” then ask what should return next time.`,
        why:fourthAnchor ? `The supplied favorite “${fourthAnchor}” remains visible in the final step while Qloo-ranked “${d}” provides the adjacent cultural signal.` : `“${d}” keeps the closing step grounded in selected Qloo evidence so the plan ends in the same cultural neighborhood it started in.`,
        ...(fourthAnchor ? { anchorName:fourthAnchor } : {}), affinityLabel:d,
      },
    ];
  },
};