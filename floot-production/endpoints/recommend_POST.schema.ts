import { z } from "zod";
import superjson from "superjson";

const anchorType = z.enum(["any","artist","movie","book","brand","destination","place","podcast","tv_show","videogame"]);
const anchor = z.union([
  z.string().trim().min(2).max(100),
  z.object({
    query:z.string().trim().min(2).max(100),
    type:anchorType.optional(),
  }).strict(),
]);

export const schema = z.object({
  anchors:z.array(anchor).min(2).max(4),
  energy:z.enum(["calm","social","active"]),
  setting:z.enum(["one-on-one","small-group","community"]),
  durationMinutes:z.union([z.literal(30),z.literal(45),z.literal(60)]).optional(),
  confirmedEntityIds:z.array(z.string().trim().min(1).max(200)).max(4).optional(),
  reviewToken:z.string().trim().min(1).max(128).optional(),
}).strict();

export type InputType = z.infer<typeof schema>;

export type RequestContext = {
  anchors:{ query:string; typeUrn?:string }[];
  energy:string;
  setting:string;
  durationMinutes:number;
};

export type ResolvedAnchor = {
  query:string;
  name:string;
  urn:string;
  entityId:string;
  requestedTypeUrn?:string;
  resolutionMatch:"exact-name"|"top-result";
};

export type OutputType = {
  requestContext?:RequestContext;
  summary:string;
  resolvedAnchors:ResolvedAnchor[];
  affinities:{ label:string; score:number|null; rank?:number }[];
  plan:{ title:string; duration:string; action:string; why:string; anchorName?:string; affinityLabel?:string }[];
  agentTrace?:{ stage:"resolve"|"evaluate"|"compose"|"explain"; status:"ok"|"warning"; detail:string }[];
  evidence?:{
    meanNormalizedScore:number|null;
    evidenceBasis:"normalized-score"|"ranked-order";
    selectedAffinityCount:number;
    returnedAffinityCount:number;
    selectedAffinityLabels:string[];
    resolvedAnchorCount:number;
    exactResolutionCount:number;
    topResultResolutionCount:number;
    categoryHintCount:number;
    explainabilityResultCount:number;
    aggregateExplainabilityAvailable:boolean;
    sessionDurationMinutes:number;
    energy:string;
    setting:string;
  };
  provenance?:{
    source:"qloo-live"|"illustrative-demo";
    apiOrigin:string;
    contractVersion:string;
    generatedAt:string;
  };
};

export type ReviewRequiredType = {
  error:string;
  code:"QLOO_RESOLUTION_REVIEW_REQUIRED";
  contractVersion:string;
  requestContext:RequestContext;
  resolvedAnchors:ResolvedAnchor[];
  reviewToken:string;
};

export class QlooReviewRequiredError extends Error {
  review:ReviewRequiredType;
  constructor(review:ReviewRequiredType) {
    super(review.error);
    this.review = review;
  }
}

export const postRecommend = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch("/_api/recommend", {
    method:"POST",
    body:superjson.stringify(validatedInput),
    ...init,
    headers:{ "Content-Type":"application/json", ...(init?.headers ?? {}) },
  });
  const parsed = superjson.parse<any>(await result.text());
  if (
    result.status === 409 &&
    parsed?.code === "QLOO_RESOLUTION_REVIEW_REQUIRED" &&
    typeof parsed?.reviewToken === "string"
  ) {
    throw new QlooReviewRequiredError(parsed as ReviewRequiredType);
  }
  if (!result.ok) throw new Error(typeof parsed?.error === "string" ? parsed.error : "Could not run the cultural agent.");
  return parsed as OutputType;
};
