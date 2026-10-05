import superjson from "superjson";
import type { OutputType } from "./status_GET.schema";
import { qlooSessionLogic } from "../helpers/qlooSessionLogic";
let cached:{ expiresAt:number; output:OutputType }|null=null;

function response(output: OutputType) {
  return new Response(superjson.stringify(output), {
    headers:{
      "Content-Type":"application/json",
      "Cache-Control":"no-store",
    },
  });
}

function finish(output:OutputType) {
  cached={expiresAt:Date.now()+30_000,output};
  return response(output);
}

export async function handle() {
  if (cached && cached.expiresAt > Date.now()) return response(cached.output);
  const raw = Reflect.get(process.env, "QLOO_API_KEY");
  const apiKey = typeof raw === "string" ? raw.trim() : "";
  const base: Omit<OutputType, "qlooConfigured" | "qlooConnected" | "qlooStatus" | "mode"> = {
    qlooApiOrigin:qlooSessionLogic.apiOrigin,
    contractVersion:qlooSessionLogic.contractVersion,
    service:"resonance",
  };

  if (!apiKey) {
    return finish({
      ...base,
      qlooConfigured:false,
      qlooConnected:false,
      qlooStatus:"preview",
      mode:"preview",
    });
  }

  try {
    const url = new URL("/v2/tags/types", qlooSessionLogic.apiOrigin);
    url.searchParams.set("take","1");
    const probe = await fetch(url, {
      headers:{ "x-api-key":apiKey, accept:"application/json" },
      redirect:"error",
      signal:AbortSignal.timeout(8_000),
    });

    if (probe.ok) {
      return finish({
        ...base,
        qlooConfigured:true,
        qlooConnected:true,
        qlooStatus:"ready",
        mode:"live",
      });
    }
    if (probe.status === 429) {
      return finish({
        ...base,
        qlooConfigured:true,
        qlooConnected:false,
        qlooStatus:"rate-limited",
        mode:"preview",
      });
    }
  } catch {}

  return finish({
    ...base,
    qlooConfigured:true,
    qlooConnected:false,
    qlooStatus:"degraded",
    mode:"preview",
  });
}
