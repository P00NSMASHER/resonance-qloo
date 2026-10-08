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

  // The Insights API ranks each tag family independently. Interleave real
  // results from distinct activity-relevant families instead of comparing
  // their scores as if they were one calibrated global leaderboard.
  balanceGenreAffinities(groups: { label:string; score:number|null; rank:number }[][]) {
    const output:{ label:string; score:number|null; rank:number }[] = [];
    const seen=new Set<string>();
    const maxLength=Math.max(0,...groups.map(group=>group.length));
    for(let index=0;index<maxLength;index++) {
      for(const group of groups) {
        const item=group[index];
        if(!item) continue;
        const normalized=qlooSessionLogic.normalizeQuery(item.label);
        if(!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        output.push({label:item.label.trim(),score:item.score,rank:output.length+1});
      }
    }
    return output;
  },

  selectSessionArchetype(tags: { label:string }[], energy = "calm", setting = "small-group") {
    const labels = tags.map(item => item.label.toLocaleLowerCase("en-US").split(/[^a-z0-9]+/).filter(Boolean));
    const score = (terms:string[]) => labels.reduce((sum,tokens) => sum + terms.filter(term => {
      const termTokens = term.split(" ");
      return termTokens.length === 1
        ? tokens.includes(termTokens[0])
        : tokens.join(" ").includes(termTokens.join(" "));
    }).length,0);
    const memory = score(["jazz","swing","oldies","timeless","reporter","history","broadway","vocal","piano","nostalgia","classic"]);
    const sensory = score(["food","culinary","restaurant","taste","travel","place","garden","nature","fashion","design","color","scent"]);
    const creative = score(["inventive","creative","cultural arts","art","music","dance","joyous","optimism","optimistic","craft"]);
    if (sensory > memory && sensory >= creative) return "Sensory & social" as const;
    if (creative > memory && creative > sensory) return "Creative participation" as const;
    if (memory > sensory && memory > creative) return "Memory & conversation" as const;
    if (energy === "active") return "Creative participation" as const;
    if (setting === "community") return "Sensory & social" as const;
    return "Memory & conversation" as const;
  },

  planFromTags(
    tags: { label:string; score:number|null; rank?:number }[],
    energy: string,
    setting: string,
    anchorNames: string[] = [],
    durationMinutes = 45,
  ) {
    const names = tags.map(item => item.label);
    const a=names[0]??"familiar favorites", b=names[1]??a, cc=names[2]??b, d=names[3]??cc;
    const [firstAnchor,secondAnchor,thirdAnchor,fourthAnchor]=anchorNames;
    const durations=durationMinutes===30?["5 min","10 min","10 min","5 min"]:durationMinutes===60?["10 min","20 min","20 min","10 min"]:["10 min","10 min","15 min","10 min"];
    const energyLine=energy==="active"?"invite movement, clapping, or choosing between options":energy==="social"?"invite easy back-and-forth conversation":"keep the pace gentle and low-pressure";
    const settingLine=setting==="one-on-one"?"for one person and one companion":setting==="community"?"for a room where people can join or step out freely":"for a small group with room for individual responses";
    const archetype=qlooSessionLogic.selectSessionArchetype(tags,energy,setting);
    const item=(title:string,duration:string,action:string,why:string,anchorName:string|undefined,affinityLabel:string)=>({title,duration,action,why,...(anchorName?{anchorName}:{}),affinityLabel});

    if(archetype==="Sensory & social") return [
      item("Sensory welcome",durations[0],firstAnchor?`Start with “${firstAnchor}” and a concrete sensory cue connected to “${a}”; ${energyLine}.`:`Start with a concrete sensory cue connected to “${a}”; ${energyLine}.`,`“${a}” makes the opening tangible rather than purely conversational.`,firstAnchor,a),
      item("Taste & place bridge",durations[1],secondAnchor?`Connect “${secondAnchor}” with “${b}” through imagery, food, place, texture, or a simple choice. Keep it ${settingLine}.`:`Use “${b}” to bridge into imagery, food, place, texture, or a simple choice. Keep it ${settingLine}.`,`Qloo-ranked “${b}” broadens the familiar input into a sensory/social direction.`,secondAnchor,b),
      item("Shared sensory choice",durations[2],thirdAnchor?`Offer two or three sensory or social choices connecting “${thirdAnchor}” with “${cc},” and let participants choose the direction.`:`Offer two or three sensory or social choices connected to “${cc},” and let participants choose the direction.`,`“${cc}” supplies adjacent evidence while participant choice keeps the activity human-led.`,thirdAnchor,cc),
      item("Comfort close",durations[3],fourthAnchor?`Reconnect “${fourthAnchor}” with “${d}” through a comfortable sensory cue or conversation prompt, then ask what should return next time.`:`Close with a comfortable sensory cue or conversation prompt inspired by “${d},” then ask what should return next time.`,`“${d}” keeps the closing step inside the Qloo-grounded sensory neighborhood.`,fourthAnchor,d),
    ];
    if(archetype==="Creative participation") return [
      item("Creative spark",durations[0],firstAnchor?`Start from “${firstAnchor}” and use “${a}” as a prompt to notice, choose, hum, sketch, gesture, or respond; ${energyLine}.`:`Use “${a}” as a prompt to notice, choose, hum, sketch, gesture, or respond; ${energyLine}.`,`Qloo-ranked “${a}” turns the familiar input into an active creative starting point.`,firstAnchor,a),
      item("Make a connection",durations[1],secondAnchor?`Bridge “${secondAnchor}” into “${b}” with a simple create-or-choose prompt. Keep it ${settingLine}.`:`Use “${b}” for a simple create-or-choose prompt. Keep it ${settingLine}.`,`“${b}” provides an adjacent Qloo signal for participation rather than passive recall.`,secondAnchor,b),
      item("Participant-led creation",durations[2],thirdAnchor?`Let participants shape a small shared creation that connects “${thirdAnchor}” with “${cc}.”`:`Let participants shape a small shared creation around “${cc}.”`,`“${cc}” extends the taste evidence while participants determine the actual creative output.`,thirdAnchor,cc),
      item("Show & choose next",durations[3],fourthAnchor?`Close by connecting “${fourthAnchor}” with “${d},” sharing what was made or chosen, and deciding what to revisit next time.`:`Close with “${d},” share what was made or chosen, and decide what to revisit next time.`,`“${d}” grounds the close in Qloo evidence while returning control to the participants.`,fourthAnchor,d),
    ];
    return [
      item("Familiar opening",durations[0],firstAnchor?`Start with “${firstAnchor}” as the familiar cue, then branch toward “${a}”; ${energyLine}.`:`Start with music, imagery, or a short prompt shaped around “${a}”; ${energyLine}.`,firstAnchor?`The session starts from “${firstAnchor}” and uses Qloo-ranked “${a}” as adjacent memory/conversation evidence.`:`Qloo surfaced “${a}” near the top of the memory/conversation evidence.`,firstAnchor,a),
      item("Memory bridge",durations[1],secondAnchor?`Bridge from “${secondAnchor}” into “${b}” with a scene, photo, lyric, headline, or memory prompt. Keep it ${settingLine}.`:`Use “${b}” as a bridge into a scene, photo, lyric, headline, or memory prompt. Keep it ${settingLine}.`,`Qloo-ranked “${b}” provides a specific adjacent bridge instead of a generic nostalgia prompt.`,secondAnchor,b),
      item("Conversation choice",durations[2],thirdAnchor?`Offer two or three conversation directions connecting “${thirdAnchor}” with “${cc},” and let participants choose.`:`Offer two or three conversation directions connected to “${cc},” and let participants choose.`,`“${cc}” extends the known tastes while preserving participant choice.`,thirdAnchor,cc),
      item("Recall & close",durations[3],fourthAnchor?`Reconnect “${fourthAnchor}” with “${d},” invite one final memory or preference, then ask what should return next time.`:`Use “${d}” for one final memory or preference prompt, then ask what should return next time.`,`“${d}” keeps the close inside the Qloo-grounded memory/conversation neighborhood.`,fourthAnchor,d),
    ];
  },
};
