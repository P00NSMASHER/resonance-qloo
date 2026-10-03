import superjson from "superjson";

export type OutputType = {
  qlooConfigured: boolean;
  qlooConnected: boolean;
  qlooStatus: "preview" | "ready" | "degraded" | "rate-limited";
  qlooApiOrigin: string;
  contractVersion: string;
  mode: "live" | "preview";
  service: "resonance";
};

export const getStatus = async (refresh = false, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch("/_api/status" + (refresh ? "?refresh=1" : ""), {
    method:"GET",
    ...init,
  });
  if (!result.ok) throw new Error("Could not read service status.");
  return superjson.parse<OutputType>(await result.text());
};