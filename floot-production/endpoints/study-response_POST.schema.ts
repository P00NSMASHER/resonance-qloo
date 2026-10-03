import { z } from "zod";
import superjson from "superjson";

export const STUDY_VERSION = "2026-10-03-v1" as const;
export const STUDY_ROLES = [
  "activity-director",
  "activity-assistant",
  "family-caregiver",
  "recreation-staff",
  "assisted-living-staff",
  "other-adjacent",
] as const;

const noContactInfo = (value:string) =>
  !/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(value) &&
  !/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(value);

export const schema = z.object({
  studyVersion:z.literal(STUDY_VERSION),
  responseId:z.string().regex(/^[0-9a-f-]{20,64}$/i),
  role:z.enum(STUDY_ROLES),
  baselineSeconds:z.number().int().min(15).max(3600),
  resonanceSeconds:z.number().int().min(5).max(1800),
  relevance:z.number().int().min(1).max(5),
  novelty:z.number().int().min(1).max(5),
  usefulness:z.number().int().min(1).max(5),
  wouldUse:z.boolean(),
  feedback:z.string().trim().min(3).max(500).refine(noContactInfo),
  consent:z.literal(true),
}).strict();

export type InputType = z.infer<typeof schema>;
export type OutputType = { accepted:true; studyVersion:typeof STUDY_VERSION };

export const postStudyResponse = async (body:InputType):Promise<OutputType> => {
  const validated = schema.parse(body);
  const result = await fetch("/_api/study-response", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:superjson.stringify(validated),
  });
  const parsed = superjson.parse<any>(await result.text());
  if (!result.ok) throw new Error(typeof parsed?.error === "string" ? parsed.error : "Could not submit study response.");
  return parsed as OutputType;
};
   46