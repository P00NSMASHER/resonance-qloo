import superjson from "superjson";
import { schema, STUDY_VERSION, type OutputType } from "./study-response_POST.schema";

const buckets = new Map<string,{ count:number; resetAt:number }>();

function json(body:unknown,status=200) {
  return new Response(superjson.stringify(body), {
    status,
    headers:{ "Content-Type":"application/json", "Cache-Control":"no-store" },
  });
}

async function clientDigest(request:Request) {
  const raw=(request.headers.get("x-forwarded-for")||request.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim();
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
}

async function allow(request:Request) {
  const now=Date.now();
  for (const [stored,bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(stored);
  const key=await clientDigest(request);
  const current=buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key,{count:1,resetAt:now+60_000});
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

export async function handle(request:Request) {
  let input;
  try {
    input=schema.parse(superjson.parse(await request.text()));
  } catch {
    return json({error:"Study response did not match the anonymous validation contract."},400);
  }
  if (!await allow(request)) return json({error:"Too many study submissions. Please try again later."},429);

  const {feedback,...metrics}=input;
  console.info("RESONANCE_STUDY_RESPONSE", JSON.stringify({
    ...metrics,
    feedbackWithheldFromLogs:true,
    feedbackLength:feedback.length,
    submittedAt:new Date().toISOString(),
  }));

  const output:OutputType={accepted:true,studyVersion:STUDY_VERSION};
  return json(output);
}
