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

The proof script requires the event kit's minimum public harness version (0.1.26+), starts the canonical `qloo mcp` server, checks `qloo_capabilities`, and runs `qloo_find_tags`. It records the harness version in the request-to-result artifact. Redaction covers both suspicious field names and the literal `QLOO_API_KEY` value under arbitrary nested fields; a final serialized-output guard refuses to emit the artifact if the original key survives. MCP tool-level `isError` results are recorded as `tool_reported_error: true` and make the proof command fail instead of being mistaken for successful evidence. The MCP subprocess receives only a minimal environment allowlist, so unrelated parent-process secrets are not forwarded into the proof tool.

The application code uses the Qloo Agentic Hackathon event gateway required by the starter instructions:

- Event API base: `https://hackathon.api.qloo.com`
- The base URL remains an explicit HTTPS configuration point for future Qloo instructions
- Search: `/search`
- Taste analysis: `/v2/insights?filter.type=urn:tag`
- Input entity signal: `signal.interests.entities=<Qloo entity UUID>`
- Tag output: `results.tags`

## 3. Redacted request-to-result explanation

### Verified now

- Request shape, input validation, result provenance, and fail-closed behavior are covered by source and CI.
- Direct npm dependencies are exact-version pinned, the npm v3 lockfile is committed, CI installs with `npm ci`, and submission preflight verifies the root lock maps exactly to `package.json`.
- Live status and recommendation provenance carry the non-secret Qloo API origin; the evidence-capture script requires it to match the trusted hackathon gateway before emitting a proof artifact.
- Both review-required and successful recommendation responses carry a normalized `requestContext` receipt for the submitted anchors/type hints, energy, setting, and duration. The browser validates it before showing review/live evidence, copied session text preserves it, and live evidence capture rejects mismatched receipts.
- Search parsing supports the UUID IDs documented for Qloo entity signals.
- Each resolved entity is classified as either an exact normalized-name match or a Qloo top-result match; no confidence score is invented.
- A non-exact Qloo top result cannot feed taste analysis immediately. Resonance returns a review-required response first, shows the resolved input → entity mapping, and issues a five-minute HMAC review receipt. The follow-up must return that receipt with the exact reviewed Qloo entity IDs; IDs alone are rejected.
- Confirmation is bound to the normalized request context and current resolved entity IDs. Edited anchors/category hints, energy, setting, duration, a changed Qloo match, an expired receipt, or Qloo credential rotation must be reviewed again rather than inheriting stale approval. The credential+origin-derived signer remains consistent across ordinary server instances using the same reviewed Qloo origin.
- After confirmation, the live trace records that the Qloo top-result match was explicitly confirmed before taste analysis, and exports preserve the resolution classification.
- Live evidence capture requires both `RESONANCE_CONFIRMED_ENTITY_IDS` and the 409-issued `RESONANCE_REVIEW_TOKEN` when review is needed. Its emitted redaction-safe `confirmation_receipt` records only that the receipt was used plus the reviewed mappings; it never emits the receipt value, and it verifies that every successful top-result match was actually present in the explicit confirmation set.
- Tag parsing matches the documented `results.tags` response shape.
- Taste analysis first requests `feature.explainability=true`; Resonance records only the presence/count of non-empty Qloo `query.explainability` metadata and does not reinterpret undocumented attribution fields. If Qloo rejects that optional feature parameter with HTTP 400/422, the client makes one bounded compatibility retry without the flag so core taste evidence can still be returned; auth, quota, redirect, and server failures are not retried by this fallback.
- Missing numeric affinity scores remain `null`; Resonance does not fabricate a percentage.
- When Qloo supplies ordered-but-unscored tags, the agent records `ranked-order` as its evidence basis.
- The service retains up to eight returned taste signals for inspection while selecting at most four to drive the four-step session.
- The selection rule is exposed in the UI: use the highest real numeric Qloo affinities when enough scores exist; otherwise preserve Qloo's returned rank order.
- The UI shows the selected-versus-returned count and marks chosen evidence with stable **Plan signal #N** numbering (up to four selected signals) while leaving unselected results visible as **Additional evidence**.
- Those same signal numbers are carried into the activity cards and copied session audit trail, so a judge can trace a selected Qloo signal into the plan step it influenced.
- The live and illustrative result views expose an interpretation limit beside the evidence: Qloo affinities are aggregate cultural signals, not probabilities or claims about an individual, and final activity choices remain with the facilitator.
- Demo data is explicitly labeled illustrative and is not represented as Qloo output.
- The public repo contains a redaction-safe MCP proof script.

### Credential connected and readiness verified; end-to-end live evidence pending

The final evidence block will record:

- the exact Qloo tool/workflow, public harness version, and Qloo API origin used;
- a redacted request and the normalized request-context receipt echoed by the live response;
- the resolved entity/tag choice, including whether each entity was an exact-name match or a Qloo top-result match and, for any non-exact match, evidence that its exact Qloo entity ID was confirmed before taste analysis;
- the returned status and summary;
- the full returned taste-signal subset retained for inspection and the exact numbered signals selected for the plan;
- the selected-versus-returned signal count;
- whether the evidence used Qloo numeric scores or ranked result order;
- how many taste results carried Qloo-native explainability metadata and whether aggregate explainability was present;
- the numbered signal-to-activity mapping used by the resulting session plan;
- the artifact-level interpretation limit stating that Qloo affinities are aggregate cultural signals, not probabilities or claims about an individual;
- the explicit facilitator-control statement preserved with the artifact;
- why that evidence was sufficient for the resulting session plan.

No claim about a specific live Qloo result should be treated as verified until this section is replaced with captured event evidence.

## 4. Demo and screenshots

Live demo:

https://resonance-qloo.floot.app

The event-issued credential is connected to Floot and the public status endpoint has verified the hackathon origin in `live/ready` state. The first real public recommendation reached the intended HTTP 409 review gate for one non-exact Qloo match. The confirmed follow-up then received Qloo HTTP 429 before taste evidence completed. The illustrative preview remains clearly labeled, and the final live-result screenshot/evidence artifact should be captured after the upstream rate limit clears.

## 5. Clean-environment setup

See the root README for full setup. The minimum path is:

```bash
git clone https://github.com/P00NSMASHER/resonance-qloo.git
cd resonance-qloo
npm ci
npm install --global @qloo/qloo-harness
cp .env.example .env
# add the event-issued QLOO_API_KEY to .env
# keep QLOO_API_BASE_URL=https://hackathon.api.qloo.com
npm run typecheck
npm test
npm run build
npm run smoke:preview
```

The official Qloo harness requires Node.js 22.19 or newer.

## 6. Known limitations

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md).

The most important current limitation is no longer credential delivery or hosting. The credential is connected and verified; the remaining blocker to a complete live evidence artifact is the upstream Qloo 429 encountered on the post-review taste-analysis request.
