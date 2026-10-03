import superjson from "superjson";
import type { OutputType } from "./status_GET.schema";
import { qlooSessionLogic } from "../helpers/qlooSessionLogic";

function response(output: OutputType) {
  return new Response(superjson.stringify(output), {
    headers:{
      "Content-Type":"application/json",
      "Cache-Control":"no-store",
    },
  });
}

export async function handle() {
  const raw = Reflect.get(process.env, "QLOO_API_KEY");
  const apiKey = typeof raw === "string" ? raw.trim() : "";
  const base: Omit<OutputType, "qlooConfigured" | "qlooConnected" | "qlooStatus" | "mode"> = {
    qlooApiOrigin:qlooSessionLogic.apiOrigin,
    contractVersion:qlooSessionLogic.contractVersion,
    service:"resonance",
  };

  if (!apiKey) {
    return response({
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
      return response({
        ...base,
        qlooConfigured:true,
        qlooConnected:true,
        qlooStatus:"ready",
        mode:"live",
      });
    }
    if (probe.status === 429) {
      return response({
        ...base,
        qlooConfigured:true,
        qlooConnected:false,
        qlooStatus:"rate-limited",
        mode:"preview",
      });
    }
  } catch {}

  return response({
    ...base,
    qlooConfigured:true,
    qlooConnected:false,
    qlooStatus:"degraded",
    mode:"preview",
  });
}
