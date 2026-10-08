import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import superjson from "superjson";
import { schema, type OutputType, type RequestContext, type ResolvedAnchor } from "./recommend_POST.schema";
import { qlooSessionLogic } from "../helpers/qlooSessionLogic";

const searchCache = new Map<string,{ expiresAt:number; value:unknown }>();
const tasteCache = new Map<string,{ expiresAt:number; value:unknown }>();
const SEARCH_TTL_MS = 10 * 60_000;
const TASTE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 250;
const clientWindows = new Map<string,{ count:number; resetAt:number }>();
let globalWindow = { count:0, resetAt:0 };

function allowUpstream(request:Request) {
  const now=Date.now();
  if (globalWindow.resetAt <= now) globalWindow={count:0,resetAt:now+60_000};
  if (globalWindow.count >= 60) return false;
  const raw=(request.headers.get("x-forwarded-for")||request.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim();
  const key=createHash("sha256").update(raw).digest("hex");
  for (const [stored,window] of clientWindows) if (window.resetAt <= now) clientWindows.delete(stored);
  const window=clientWindows.get(key);
  if (!window || window.resetAt <= now) clientWindows.set(key,{count:1,resetAt:now+60_000});
  else { if (window.count >= 10) return false; window.count += 1; }
  globalWindow.count += 1;
  return true;
}

function credentialFingerprint(apiKey:string) {
  return createHash("sha256")
    .update(qlooSessionLogic.apiOrigin)
    .update("\0")
    .update(apiKey)
    .digest("hex")
    .slice(0,16);
}

async function cachedQloo(
  cache:Map<string,{ expiresAt:number; value:unknown }>,
  key:string,
  ttlMs:number,
  loader:()=>Promise<unknown>,
) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value;
  if (hit) cache.delete(key);
  const value = await loader();
  while (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key,{ expiresAt:now + ttlMs, value });
  return value;
}

class QlooRequestError extends Error {
  status:number;
  endpoint:string;
  detail:string;
  constructor(status:number, endpoint:string, detail = "") {
    super(`Qloo ${endpoint} failed (${status}).`);
    this.status = status;
    this.endpoint = endpoint;
    this.detail = detail;
  }
}

function json(body:unknown, status = 200) {
  return new Response(superjson.stringify(body), {
    status,
    headers:{ "Content-Type":"application/json", "Cache-Control":"no-store" },
  });
}

function anchorKey(query:string, typeUrn?:string) {
  return `${typeUrn ?? "any"}|${qlooSessionLogic.normalizeQuery(query)}`;
}

function signingKey(apiKey:string) {
  return createHmac("sha256", apiKey)
    .update("resonance-resolution-review:v1")
    .update("\n")
    .update(qlooSessionLogic.apiOrigin)
    .update("\n")
    .update(qlooSessionLogic.contractVersion)
    .digest();
}

function reviewPayload(context:RequestContext, entityIds:string[]) {
  return JSON.stringify({
    anchors:context.anchors.map(item => anchorKey(item.query,item.typeUrn)),
    energy:context.energy,
    setting:context.setting,
    durationMinutes:context.durationMinutes,
    entityIds:[...new Set(entityIds.map(qlooSessionLogic.entityIdentity))].sort(),
  });
}

function reviewMac(secret:Uint8Array, context:RequestContext, entityIds:string[], expiresAt:number) {
  return createHmac("sha256", secret)
    .update(String(expiresAt))
    .update("\n")
    .update(reviewPayload(context,entityIds))
    .digest("base64url");
}

function createReviewToken(secret:Uint8Array, context:RequestContext, entityIds:string[]) {
  const expiresAt = Date.now() + 5 * 60_000;
  return `${expiresAt.toString(36)}.${reviewMac(secret,context,entityIds,expiresAt)}`;
}

function verifyReviewToken(secret:Uint8Array, context:RequestContext, entityIds:string[], token?:string) {
  if (!token) return false;
  const [expiresRaw,actualMac,...extra] = token.split(".");
  if (!expiresRaw || !actualMac || extra.length || !/^[A-Za-z0-9_-]{43}$/.test(actualMac)) return false;
  const expiresAt = Number.parseInt(expiresRaw,36);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const expectedMac = reviewMac(secret,context,entityIds,expiresAt);
  const actual = Buffer.from(actualMac);
  const expected = Buffer.from(expectedMac);
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}

async function qlooJson(url:URL, apiKey:string, endpoint:string) {
  let response:Response;
  try {
    response = await fetch(url, {
      headers:{ "x-api-key":apiKey, accept:"application/json" },
      redirect:"error",
      signal:AbortSignal.timeout(8_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new Error("QLOO_TIMEOUT");
    throw error;
  }
  if (!response.ok) {
    console.warn("Qloo upstream request failed", {
      endpoint,
      status:response.status,
      explainabilityRequested:url.searchParams.has("feature.explainability"),
    });
    const detail = (await response.text().catch(() => "")).slice(0,1_000);
    throw new QlooRequestError(response.status,endpoint,detail);
  }
  return response.json() as Promise<unknown>;
}

function normalizedAnchors(input:ReturnType<typeof schema.parse>) {
  return input.anchors.map(raw => {
    if (typeof raw === "string") return { query:raw.trim() };
    const typeUrn = qlooSessionLogic.anchorTypeUrn(raw.type);
    return { query:raw.query.trim(), ...(typeUrn ? { typeUrn } : {}) };
  });
}

export async function handle(request:Request) {
  if (!allowUpstream(request)) return json({error:"Recommendation rate limit reached. Please retry in one minute."},429);
  let input:ReturnType<typeof schema.parse>;
  try {
    input = schema.parse(superjson.parse(await request.text()));
  } catch {
    return json({ error:"Request body did not match the Resonance recommendation contract." },400);
  }

  const raw = Reflect.get(process.env,"QLOO_API_KEY");
  const apiKey = typeof raw === "string" ? raw.trim() : "";
  if (!apiKey) return json({ error:"Live Qloo access is not connected yet. Add the event-issued QLOO_API_KEY to run the agent." },503);
  const credentialId = credentialFingerprint(apiKey);

  const anchors = normalizedAnchors(input);
  const durationMinutes = input.durationMinutes ?? 45;
  const requestContext:RequestContext = {
    anchors:anchors.map(item => ({ query:item.query, ...(item.typeUrn ? { typeUrn:item.typeUrn } : {}) })),
    energy:input.energy,
    setting:input.setting,
    durationMinutes,
  };

  try {
    const resolvedCandidates = await Promise.all(anchors.map(async anchor => {
      const url = new URL("/search",qlooSessionLogic.apiOrigin);
      url.searchParams.set("query",anchor.query);
      if (anchor.typeUrn) url.searchParams.append("types",anchor.typeUrn);
      url.searchParams.set("take","5");
      url.searchParams.set("sort_by","match");
      const searchKey = [
        credentialId,
        qlooSessionLogic.normalizeQuery(anchor.query),
        anchor.typeUrn ?? "any",
      ].join("|");
      return qlooSessionLogic.extractResolved(
        anchor.query,
        await cachedQloo(
          searchCache,
          searchKey,
          SEARCH_TTL_MS,
          () => qlooJson(url,apiKey,"search"),
        ),
        anchor.typeUrn,
      );
    }));

    const resolved:ResolvedAnchor[] = [];
    const seen = new Set<string>();
    for (const item of resolvedCandidates) {
      if (!item) continue;
      const identity = qlooSessionLogic.entityIdentity(item.entityId);
      if (seen.has(identity)) continue;
      seen.add(identity);
      resolved.push(item);
    }
    if (resolved.length < 2) return json({ error:"Qloo returned too little reliable entity evidence. Try more specific favorites." },422);

    const topResultIds = resolved
      .filter(item => item.resolutionMatch === "top-result")
      .map(item => item.entityId);
    if (topResultIds.length) {
      const confirmed = [...new Set((input.confirmedEntityIds ?? []).map(qlooSessionLogic.entityIdentity))];
      const confirmedSet = new Set(confirmed);
      const validReceipt = verifyReviewToken(signingKey(apiKey),requestContext,confirmed,input.reviewToken);
      const allTopResultsConfirmed = validReceipt && topResultIds.every(id => confirmedSet.has(qlooSessionLogic.entityIdentity(id)));
      if (!allTopResultsConfirmed) {
        return json({
          error:"Review Qloo entity matches before continuing.",
          code:"QLOO_RESOLUTION_REVIEW_REQUIRED",
          contractVersion:qlooSessionLogic.contractVersion,
          requestContext,
          resolvedAnchors:resolved,
          reviewToken:createReviewToken(signingKey(apiKey),requestContext,topResultIds),
        },409);
      }
    }

    const buildInsights = (tagType:string, includeExplainability:boolean) => {
      const url = new URL("/v2/insights",qlooSessionLogic.apiOrigin);
      url.searchParams.set("filter.type","urn:tag");
      url.searchParams.set("filter.tag.types",tagType);
      url.searchParams.set("signal.interests.entities",resolved.map(item => item.entityId).join(","));
      url.searchParams.set("take","8");
      if (includeExplainability) url.searchParams.set("feature.explainability","true");
      return url;
    };

    const loadGenre = async (tagType:string) => {
      const identifiers=[credentialId,...resolved.map(item=>qlooSessionLogic.entityIdentity(item.entityId)).sort(),tagType];
      const getCached=(explainability:boolean)=>cachedQloo(
        tasteCache,
        [...identifiers,explainability?"explainability":"plain"].join("|"),
        TASTE_TTL_MS,
        ()=>qlooJson(buildInsights(tagType,explainability),apiKey,"insights"),
      );
      try { return await getCached(true); }
      catch(error) {
        const detail=error instanceof QlooRequestError?error.detail.toLocaleLowerCase("en-US"):"";
        if(error instanceof QlooRequestError && [400,422].includes(error.status) && detail.includes("explainability")) {
          return getCached(false);
        }
        throw error;
      }
    };

    // An unfiltered urn:tag ranking can prioritize hotel prices and star
    // ratings above music for a music-led session. Qloo's verified tag-family
    // filter keeps the activity evidence meaningful while preserving the
    // actual ranked upstream items.
    const genreTypes=["urn:tag:genre:music","urn:tag:genre:media"];
    const genreResults=await Promise.allSettled(genreTypes.map(loadGenre));
    const successful=genreResults.filter(
      (item):item is PromiseFulfilledResult<unknown>=>item.status==="fulfilled"
    );
    if(!successful.length) {
      const failed=genreResults.find(
        (item):item is PromiseRejectedResult=>item.status==="rejected"
      );
      throw failed?.reason ?? new Error("No Qloo genre signals available");
    }
    const affinities=qlooSessionLogic.balanceGenreAffinities(
      successful.map(item=>qlooSessionLogic.extractAffinities(item.value)),
    );
    if (affinities.length < 3) return json({ error:"Qloo returned too little reliable affinity evidence. Try a different set of anchors." },422);
    const selected=affinities.slice(0,4);
    // The raw scores remain attached to individual Qloo results, but a
    // mean across two different tag families would imply false precision.
    const selection={
      selected,
      evidenceBasis:"ranked-order" as const,
      meanNormalizedScore:null,
    };
    if (selection.meanNormalizedScore !== null && selection.meanNormalizedScore < .2) {
      return json({ error:"Qloo returned evidence that was too weak for a useful session. Try more specific anchors." },422);
    }

    const explainability = successful.reduce((totals,item)=>{
      const next=qlooSessionLogic.extractExplainabilitySummary(item.value);
      return {
        resultCount:totals.resultCount+next.resultCount,
        aggregateAvailable:totals.aggregateAvailable||next.aggregateAvailable,
      };
    },{resultCount:0,aggregateAvailable:false});
    const plan = qlooSessionLogic.planFromTags(
      selection.selected,
      input.energy,
      input.setting,
      resolved.map(item => item.name),
      durationMinutes,
    );
    const exactResolutionCount = resolved.filter(item => item.resolutionMatch === "exact-name").length;
    const topResultResolutionCount = resolved.length - exactResolutionCount;
    const categoryHintCount = resolved.filter(item => Boolean(item.requestedTypeUrn)).length;
    const evidence:NonNullable<OutputType["evidence"]> = {
      meanNormalizedScore:selection.meanNormalizedScore,
      evidenceBasis:selection.evidenceBasis,
      selectedAffinityCount:selection.selected.length,
      returnedAffinityCount:affinities.length,
      selectedAffinityLabels:selection.selected.map(item => item.label),
      resolvedAnchorCount:resolved.length,
      exactResolutionCount,
      topResultResolutionCount,
      categoryHintCount,
      explainabilityResultCount:explainability.resultCount,
      aggregateExplainabilityAvailable:explainability.aggregateAvailable,
      sessionDurationMinutes:durationMinutes,
      energy:input.energy,
      setting:input.setting,
    };
    const agentTrace:NonNullable<OutputType["agentTrace"]> = [
      {
        stage:"resolve", status:"ok",
        detail:`Resolved ${resolved.length} cultural anchors into Qloo entity evidence; ${exactResolutionCount} exact-name and ${topResultResolutionCount} explicitly confirmed top-result match(es).`,
      },
      {
        stage:"evaluate", status:"ok",
        detail:`Selected ${selection.selected.length} Qloo-ranked genre signals across ${successful.length} activity-relevant family/families; interleaved categories without treating their scores as a shared global ranking.`,
      },
      {
        stage:"compose", status:"ok",
        detail:`Mapped the selected signals into a ${durationMinutes}-minute ${input.energy} session for a ${input.setting} setting.`,
      },
      {
        stage:"explain",
        status:explainability.resultCount > 0 || explainability.aggregateAvailable ? "ok" : "warning",
        detail:explainability.resultCount > 0 || explainability.aggregateAvailable
          ? `Attached visible rationales; Qloo returned explainability metadata for ${explainability.resultCount} result(s).`
          : "Attached visible rationales. Qloo explainability was requested, but this response did not include attribution metadata.",
      },
    ];

    const output:OutputType = {
      requestContext,
      summary:`Built from ${resolved.length} resolved Qloo entities and ${affinities.length} cross-category affinity signals.`,
      resolvedAnchors:resolved,
      affinities,
      plan,
      agentTrace,
      evidence,
      provenance:{
        source:"qloo-live",
        apiOrigin:qlooSessionLogic.apiOrigin,
        contractVersion:qlooSessionLogic.contractVersion,
        generatedAt:new Date().toISOString(),
      },
    };
    return json(output);
  } catch (error) {
    if (error instanceof QlooRequestError) {
      if (error.status === 429) return json({ error:"Qloo rate limit reached. Please try again later." },429);
      return json({ error:`Qloo ${error.endpoint} request failed (${error.status}).` },502);
    }
    if (error instanceof Error && error.message === "QLOO_TIMEOUT") {
      return json({ error:"Qloo took too long to respond. Please try again." },504);
    }
    return json({ error:"The Qloo request could not be completed." },502);
  }
}
