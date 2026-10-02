import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execFileSync } from "node:child_process";
import { assertSecretAbsent, redactProof } from "./proof-redaction.mjs";
import { buildQlooProofEnv } from "./proof-environment.mjs";

const query = process.argv.slice(2).join(" ").trim() || "classic jazz vocals";
const MIN_HARNESS_VERSION = [0, 1, 26];

function parseSemver(value) {
  const match = String(value).match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1, 4).map(Number) : null;
}

function versionAtLeast(actual, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }
  return true;
}

let harnessVersion;
try {
  const rawVersion = execFileSync("qloo", ["--version"], { encoding:"utf8" }).trim();
  const parsed = parseSemver(rawVersion);
  if (!parsed) throw new Error(`Could not parse qloo harness version from: ${rawVersion}`);
  if (!versionAtLeast(parsed, MIN_HARNESS_VERSION)) {
    throw new Error(`Qloo hackathon harness 0.1.26 or newer is required; found ${rawVersion}.`);
  }
  harnessVersion = parsed.join(".");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ENOENT") || message.includes("spawnSync qloo")) {
    process.stderr.write("Cannot start qloo. Install @qloo/qloo-harness 0.1.26 or newer first.\n");
  } else {
    process.stderr.write(message + "\n");
  }
  process.exit(2);
}

const qlooApiKey = process.env.QLOO_API_KEY?.trim() || "";
if (!qlooApiKey) {
  process.stderr.write("QLOO_API_KEY is not set. Use the event-issued credential only.\n");
  process.exit(2);
}

const transport = new StdioClientTransport({
  command: "qloo",
  args: ["mcp"],
  env: buildQlooProofEnv(process.env, qlooApiKey),
});

const client = new Client({
  name: "resonance-qloo-proof",
  version: "0.1.0",
});

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
  const toolReportedError = Boolean(result.isError) || envelope.status === "error";
  const artifact = {
    generated_at: new Date().toISOString(),
    purpose: "Redacted Qloo MCP request-to-result evidence for Resonance",
    supported_surface: "qloo mcp",
    harness_version: harnessVersion,
    tool: "qloo_find_tags",
    request: { query, limit: 5 },
    available_tool_count: names.length,
    tool_reported_error: toolReportedError,
    result: redactProof(envelope, qlooApiKey),
    content: redactProof(result.content ?? [], qlooApiKey),
  };

  const serialized = JSON.stringify(artifact, null, 2);
  assertSecretAbsent(serialized, qlooApiKey);
  process.stdout.write(serialized + "\n");

  if (toolReportedError) {
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
