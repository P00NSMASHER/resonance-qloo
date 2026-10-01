import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const query = process.argv.slice(2).join(" ").trim() || "classic jazz vocals";

if (!process.env.QLOO_API_KEY?.trim()) {
  process.stderr.write("QLOO_API_KEY is not set. Use the event-issued credential only.\n");
  process.exit(2);
}

const transport = new StdioClientTransport({
  command: "qloo",
  args: ["mcp"],
  env: process.env,
});

const client = new Client({
  name: "resonance-qloo-proof",
  version: "0.1.0",
});

function redact(value) {
  if (Array.isArray(value)) return value.slice(0, 5).map(redact);
  if (!value || typeof value !== "object") return value;

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("api_key") ||
      lower.includes("apikey") ||
      lower.includes("authorization") ||
      lower.includes("credential") ||
      lower.includes("token")
    ) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (key === "results" && Array.isArray(item)) {
      out[key] = item.slice(0, 5).map(redact);
      continue;
    }
    out[key] = redact(item);
  }
  return out;
}

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map(tool => tool.name).sort();

  const required = ["qloo_capabilities", "qloo_find_tags"];
  const missing = required.filter(name => !names.includes(name));
  if (missing.length) {
    throw new Error(`Required Qloo MCP tools missing: ${missing.join(", ")}`);
  }

  const capabilities = await client.callTool({
    name: "qloo_capabilities",
    arguments: {},
  });

  const adapterReady = Boolean(capabilities.structuredContent?.adapter?.ready);
  if (!adapterReady) {
    throw new Error("Qloo MCP is available, but the event credential is not ready.");
  }

  const result = await client.callTool({
    name: "qloo_find_tags",
    arguments: { query, limit: 5 },
  });

  const envelope = result.structuredContent ?? {};
  const artifact = {
    generated_at: new Date().toISOString(),
    purpose: "Redacted Qloo MCP request-to-result evidence for Resonance",
    supported_surface: "qloo mcp",
    tool: "qloo_find_tags",
    request: { query, limit: 5 },
    available_tool_count: names.length,
    result: redact(envelope),
  };

  process.stdout.write(JSON.stringify(artifact, null, 2) + "\n");

  if (envelope.status === "error") {
    process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ENOENT") || message.includes("spawn qloo")) {
    process.stderr.write(
      "Cannot start qloo. Install the event harness first: npm install --global @qloo/qloo-harness\n"
    );
  } else {
    process.stderr.write(message + "\n");
  }
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
