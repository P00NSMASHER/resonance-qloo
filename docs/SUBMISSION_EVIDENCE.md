# Submission evidence

This file maps Resonance to the Qloo starter kit's submission guide. It deliberately separates verified evidence from work that depends on the event-issued credential.

## 1. Product problem statement

Senior-living activity teams and families often know only fragments of a person's cultural preferences: a singer, film, food, brand, book, or place. Turning those fragments into fresh, coherent engagement ideas takes time and cultural knowledge.

Resonance turns a few preference anchors into an explainable engagement-session plan while keeping the facilitator in control.

## 2. Qloo workflow / MCP tools

The official event-supported surfaces are the Qloo harness commands: `qloo explore`, `qloo exec`, `qloo api`, and `qloo mcp`.

Resonance includes a reproducible MCP verification path:

```bash
npm install --global @qloo/qloo-harness
qloo setup --qloo
npm run qloo:proof -- "classic jazz vocals"
```

The proof script starts the canonical `qloo mcp` server, checks `qloo_capabilities`, and runs `qloo_find_tags`. It prints a redacted request-to-result artifact and never prints the credential.

The application code also follows current public Qloo API documentation:

- API base: `https://api.qloo.com`
- Search: `/search`
- Taste analysis: `/v2/insights?filter.type=urn:tag`
- Input entity signal: `signal.interests.entities=<Qloo entity UUID>`
- Tag output: `results.tags`

## 3. Redacted request-to-result explanation

### Verified now

- Request shape, input validation, result provenance, and fail-closed behavior are covered by source and CI.
- Search parsing supports the UUID IDs documented for Qloo entity signals.
- Tag parsing matches the documented `results.tags` response shape.
- Taste analysis requests `feature.explainability=true`; Resonance records only the presence/count of non-empty Qloo `query.explainability` metadata and does not reinterpret undocumented attribution fields.
- Missing numeric affinity scores remain `null`; Resonance does not fabricate a percentage.
- When Qloo supplies ordered-but-unscored tags, the agent records `ranked-order` as its evidence basis.
- Demo data is explicitly labeled illustrative and is not represented as Qloo output.
- The public repo contains a redaction-safe MCP proof script.

### Pending the event credential

The final evidence block will record:

- the exact Qloo tool/workflow used;
- a redacted request;
- the resolved entity/tag choice;
- the returned status and summary;
- the small subset of results used by the product;
- whether the evidence used Qloo numeric scores or ranked result order;
- how many taste results carried Qloo-native explainability metadata and whether aggregate explainability was present;
- why that evidence was sufficient for the resulting session plan.

No claim about a specific live Qloo result should be treated as verified until this section is replaced with captured event evidence.

## 4. Demo and screenshots

Live demo:

https://resonance-qloo.floot.app

The app currently exposes a clearly labeled illustrative preview while the event-issued credential is pending. A branded Devpost thumbnail is uploaded. A live-result screenshot should be captured only after the credential is connected.

## 5. Clean-environment setup

See the root README for full setup. The minimum path is:

```bash
git clone https://github.com/P00NSMASHER/resonance-qloo.git
cd resonance-qloo
npm install
npm install --global @qloo/qloo-harness
cp .env.example .env
# add the event-issued QLOO_API_KEY to .env
npm run typecheck
npm test
npm run build
npm run smoke:preview
```

The official Qloo harness requires Node.js 22.19 or newer.

## 6. Known limitations

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md).

The most important current limitation is that the event-issued Qloo credential has been requested but has not yet arrived, so the hosted app cannot yet demonstrate a real end-to-end Qloo result.
