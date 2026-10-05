import superjson from "superjson";
import { schema, STUDY_VERSION, type OutputType } from "./study-response_POST.schema";

const buckets = new Map<string,{ count:number; resetAt:number }>();

function json(body:unknown,status=200) {
  return new Response(superjson.stringify(body), {
    status,
    headers:{ "Content-Type":"application/json", "Cache-Control":"no-store" },
  });
}

function allow(request:Request) {
  const now=Date.now();
  const key=(request.headers.get("x-forwarded-for")||request.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim();
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
  if (!allow(request)) return json({error:"Too many study submissions. Please try again later."},429);

  console.info("RESONANCE_STUDY_RESPONSE", JSON.stringify({
    ...input,
    submittedAt:new Date().toISOString(),
  }));

  const output:OutputType={accepted:true,studyVersion:STUDY_VERSION};
  return json(output);
}