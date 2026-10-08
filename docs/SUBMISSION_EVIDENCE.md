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
- The **current live** agent reads up to eight Qloo signals from each independently ranked music/media genre family, deduplicates them, retains returned evidence for inspection and selects up to four for the four-step session.
- The **current filtered live path** interleaves real Qloo genre-family rank order and records `ranked-order` rather than calculating a misleading mean from scores belonging to different categories. Historical unfiltered evidence retains its original numeric score fields for reproducibility.
- The UI shows the selected-versus-returned count and marks chosen evidence with stable **Plan signal #N** numbering (up to four selected signals) while leaving unselected results visible as **Additional evidence**.
- The default result now reduces the judge-facing story to **Your favorites → What Qloo discovered → Your session**; technical provenance is retained under **View evidence & audit trail** rather than removed.
- A tested anchor-only baseline uses only literal submitted favorites/category hints, while the Qloo side uses real returned signals. The comparison reports favorites supplied, signals returned, signals selected, activities influenced, and selected Qloo discoveries not literally named in the inputs.
- Those same signal numbers are carried into the activity cards and copied session audit trail, so a judge can trace a selected Qloo signal into the plan step it influenced.
- The live and illustrative result views expose an interpretation limit beside the evidence: Qloo affinities are aggregate cultural signals, not probabilities or claims about an individual, and final activity choices remain with the facilitator.
- Demo data is explicitly labeled illustrative and is not represented as Qloo output.
- The public repo contains a redaction-safe MCP proof script.

### Current judge input and historical unfiltered demonstration

The current default judge input is **Ella Fitzgerald + Roman Holiday**. It was selected from a **historical, unfiltered** ten-case whole-output audit at **95.0/100**. That score assessed the historical output with proxy criteria; it is neither a verified human usefulness score nor a score for the current genre-filtered implementation.

It was selected from ten complete live Qloo outputs using a published whole-result audit; no returned signal was removed before scoring. The audit is committed at [DEMO_CASE_AUDIT.md](./DEMO_CASE_AUDIT.md) / [DEMO_CASE_AUDIT.json](./DEMO_CASE_AUDIT.json).

The historically highest-scoring unfiltered case:

- resolves both anchors exactly;
- returns 8 retained Qloo signals;
- selects 4 Qloo-ranked signals: `Jazz`, `Reporter`, `Inventive`, and `swing`;
- preserves the full returned set, including `piano`, `Vocal-Jazz`, `oldies`, and `Easy Listening`;
- produces a four-step 30-minute calm small-group session;
- is captured in full at [CANONICAL_DEMO_EVIDENCE.json](./CANONICAL_DEMO_EVIDENCE.json).

Those original `Jazz` / `Reporter` / `Inventive` tags describe the **older, unfiltered** Qloo result. Today's published version requests Qloo music and media genres and adds facilitator-ready prompts; it can produce different tags and never promises those historical labels. The earlier exact-match and review-gated evidence artifacts remain unchanged for historical transparency.

### Verified public live-Qloo evidence

A redaction-safe **historical October 3 live artifact** is committed at [LIVE_QLOO_EVIDENCE.json](./LIVE_QLOO_EVIDENCE.json). It verifies the Qloo connection at that time but uses the older unfiltered selection behavior, not the current genre-family ranking. Current published screenshots and the live URL provide evidence of the updated experience.

Verified public run:

- Public endpoint: `https://resonance-qloo.floot.app/_api/recommend`
- HTTP status: `200`
- Qloo API origin: `https://hackathon.api.qloo.com`
- Provenance source: `qloo-live`
- Deployment contract: `2026-10-02.review-origin-v1`
- Generated: `2026-10-03T03:18:40.241Z`
- Request context: calm, small-group, 30 minutes
- Resolved anchors:
  - `Ella Fitzgerald` → `Ella Fitzgerald` → Qloo entity `C9A0AD41-7EDF-4C3E-A816-D1E73A17605E` → exact-name
  - `Singin' in the Rain` → `Singin' in the Rain` → Qloo entity `59775A1E-5968-480C-94B2-47BE50CA3CD2` → exact-name
- Returned Qloo taste signals: 8
- Selected plan signals: 4
- Evidence basis: `normalized-score`
- Mean selected normalized score: `0.9991819017325958`
- Selected signals:
  1. `Christian`
  2. `Jazz`
  3. `Inventive`
  4. `swing`
- Four-step result:
  1. Opening cue — Ella Fitzgerald + Christian
  2. Story bridge — Singin' in the Rain + Jazz
  3. Shared choice — Inventive
  4. Closing ritual — swing

The returned Qloo signal set also retained `Optimistic`, `piano`, `Vocal-Jazz`, and `oldies` as additional evidence rather than silently discarding them.

The public result contained the normalized request-context receipt, two exact-name Qloo resolutions, an explicit agent trace, the selected-vs-returned evidence counts, and a four-step plan. Qloo-native explainability metadata was requested but not present in this response, so the artifact records `explainabilityResultCount: 0` and `aggregateExplainabilityAvailable: false` rather than inventing attribution.

The artifact contains no Qloo API credential and no ephemeral review receipt.

The separate non-exact review-gated path is also fully verified in production. `Italian food` resolved to Qloo's top result `Italian Food Berlin`, returned HTTP 409 before taste analysis, and required the signed review receipt plus exact entity ID. After the Floot production endpoint gained bounded credential-scoped Qloo search/taste caching, the confirmed follow-up reused the recent resolution and completed with HTTP 200 `qloo-live` provenance. A redaction-safe artifact is committed at [LIVE_QLOO_REVIEW_EVIDENCE.json](./LIVE_QLOO_REVIEW_EVIDENCE.json).

## 4. Demo and screenshots

Live demo:

https://resonance-qloo.floot.app

Seven durable, browser-rendered screenshots of the **current published application** are stored in [the judge gallery](./judge-gallery/README.md), with dated SHA-256 checksums in [the image manifest](./judge-gallery/manifest.json). These are ordinary public GitHub images, not expiring CI artifacts:

1. `00-brand-desktop.png`: the live Cultural Atlas hero and navigation.
2. `00-brand-iphone.png`: the same responsive first screen at iPhone width.
3. `01-input.png`: current public default inputs and Qloo readiness.
4. `02-qloo-transformation.png`: the same-input anchor-only versus actual Qloo cultural-evidence comparison, with **signal counts rather than measured human outcomes**.
5. `03-finished-session.png`: four facilitator activities and Keep/Modify/Replace decisions.
6. `04-study-desktop.png`: the voluntary study interface at desktop size.
7. `04-study-iphone.png`: the voluntary study interface at iPhone size.

No screenshot contains fabricated research outcomes, a credential, a review token, or real participant data. The source-owned branded PNGs and editable SVG also appear under `public/brand/` and `docs/brand/`.

The event-issued credential is connected to Floot and the public status endpoint has verified the hackathon origin in `live/ready` state. Both a direct exact-match recommendation and the signed non-exact review-gated recommendation have now completed end-to-end in production with committed redaction-safe artifacts. The illustrative preview remains clearly labeled as a fallback only.

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

There is no remaining live-path proof blocker: both the exact-match and signed review-gated public Qloo flows are captured end-to-end. Remaining limitations are operational—event quota/rate limits, upstream availability, optional explainability metadata, and the interpretive limits documented in KNOWN_LIMITATIONS.md.
