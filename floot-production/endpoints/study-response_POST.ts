import superjson from "superjson";

function json(body:unknown,status=200) {
  return new Response(superjson.stringify(body), {
    status,
    headers:{ "Content-Type":"application/json", "Cache-Control":"no-store" },
  });
}

export async function handle() {
  return json({
    error:"Study closed. Phase 5 external validation was intentionally skipped; no further responses are being collected.",
  },410);
}
   15