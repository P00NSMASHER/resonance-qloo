# Judge guide

## Verified live proof

The public demo is live at https://resonance-qloo.floot.app and the server currently reports verified Qloo readiness against `https://hackathon.api.qloo.com`.

A redaction-safe HTTP 200 public live artifact is committed at [LIVE_QLOO_EVIDENCE.json](LIVE_QLOO_EVIDENCE.json). That run resolved two exact Qloo entities, retained eight returned affinity signals, selected four real numeric signals, and produced a four-step `qloo-live` session.

The non-exact path is also fully verified in production: `Italian food` resolves to Qloo's top result `Italian Food Berlin`, returns the signed HTTP 409 review gate before taste analysis, and the confirmed follow-up completes with HTTP 200 `qloo-live` provenance. See [LIVE_QLOO_REVIEW_EVIDENCE.json](LIVE_QLOO_REVIEW_EVIDENCE.json).

## Canonical demo selection

Nine complete live Qloo outputs were evaluated without removing awkward returned signals. **Aretha Franklin + The Sound of Music** scored highest because both anchors resolved exactly and the complete eight-signal set formed the strongest coherent cluster. The full audit remains public in [DEMO_CASE_AUDIT.json](DEMO_CASE_AUDIT.json).

## 60-second evaluation path

1. Open the live app: https://resonance-qloo.floot.app
2. Confirm the header reports **Live Qloo verified**.
3. Use the canonical example already loaded: `Aretha Franklin` + `The Sound of Music`, 30 minutes, calm, small group. It was selected by a transparent nine-case whole-output audit rather than by hiding individual Qloo signals. See [DEMO_CASE_AUDIT.md](DEMO_CASE_AUDIT.md) and [CANONICAL_DEMO_EVIDENCE.json](CANONICAL_DEMO_EVIDENCE.json).
4. Use **Preview with example data** only as the explicitly labeled **ILLUSTRATIVE DEMO** fallback.
5. The default result intentionally shows only three concepts: **Your favorites → What Qloo discovered → Your session**.
6. Read **How Qloo changed this session**. The left side is a deterministic anchor-only baseline that can use only the submitted favorites/category hints; the right side is grounded in the actual Qloo taste signals. The metrics quantify favorites supplied, signals returned, signals selected, activities influenced, and selected discoveries not literally named in the inputs.
7. Open **View evidence & audit trail** for the technical layer: Qloo IDs, exact-vs-top-result classification, request receipt, provenance, API origin, contract version, all retained signals, selection rule, explainability metadata, sparse-evidence **No synthetic signal** disclosure, four-stage agent trace, and activity-to-evidence rationale mapping.
8. If a top match is non-exact, verify the **Qloo match review required** gate appears before taste analysis and that confirmation is required before the final live session.

## Judging-criteria mapping

### Technological Implementation

Qloo is not an ornamental API call. It supplies the entity-resolution and cross-category taste evidence that drives the agent.

The implementation now matches current Qloo public documentation more defensibly:

- Search results are resolved to Qloo entity UUIDs (with entity-URN fallback).
- Category-aware search can constrain ambiguous anchors through Qloo's documented `types` parameter.
- The agent reports how many category hints were actually applied and preserves them beside the resolved anchors.
- Resolution is not presented as hidden confidence: each resolved entity is classified as an exact normalized-name match or a Qloo top-result match that should be reviewed.
- Both the HTTP 409 review response and HTTP 200 recommendation carry a normalized `requestContext` receipt (submitted anchors/type URNs, energy, setting, duration). The browser rejects either response if that receipt does not exactly match the form that initiated the request, and the receipt is preserved in copied/live evidence.
- A non-exact top result triggers HTTP 409 and stops before taste analysis. The response returns the normalized request receipt, resolved candidates, and a five-minute HMAC review receipt. The browser shows the input → Qloo mapping and the follow-up must include both the exact reviewed IDs and that server-issued receipt. IDs alone cannot bypass review; editing the request, expiration, a changed Qloo result, Qloo credential/API-origin rotation, or a deployment-contract change requires review again. Ordinary server-instance changes can verify the same receipt only when they share the same Qloo credential, reviewed API origin, and deployment-contract version.
- Confirmed top-result matches are preserved as such in the live evidence rather than being relabeled as exact matches.
- Independent anchor-resolution calls run concurrently to reduce live latency.
- Those IDs are passed to `signal.interests.entities` for taste analysis.
- Live status and recommendation provenance expose the non-secret Qloo API origin, allowing judges to verify that event traffic is using the hackathon gateway without exposing the credential.
- Tag results are read from `results.tags`.
- Numeric affinity values are used only if Qloo actually returns them.
- Taste analysis requests Qloo's documented `feature.explainability=true`. Resonance reports how many returned taste results actually contain non-empty `query.explainability` metadata and whether aggregate explainability is present; it does not invent attribution when Qloo omits it.
- If Qloo explicitly rejects that optional explainability feature with a 400/422 response whose detail identifies explainability, Resonance retries once without the flag. Other 400/422 validation failures remain errors rather than being masked by the fallback.
- If a tag result is rank-ordered but unscored, Resonance preserves that Qloo order and displays **Rank #N** instead of manufacturing a percentage.
- The service retains up to eight returned affinity signals for inspection while the agent selects at most four for the four-step plan.
- The selected-signal sequence is explicit and stable: the UI labels chosen evidence with stable **Plan signal #N** numbering (up to four selected signals), repeats those numbers on the corresponding activity cards, and preserves the same mapping in copied session evidence.
- Returned-but-unselected signals remain visible as **Additional evidence** instead of disappearing from the audit path.
- Fewer than three usable affinity signals fail closed. If exactly three selected signals support the four-step plan, the closing step reuses the last real selected signal and the UI/export explicitly says no synthetic fourth signal was created.

The server also keeps the event credential private, bounds inputs, times out upstream calls, and exposes an inspectable agent trace.

### Design

The app is one focused, responsive flow with a judge-first default hierarchy: **Your favorites → What Qloo discovered → Your session**. A native **View evidence & audit trail** disclosure preserves provenance, IDs, rank-vs-score labeling, review classifications, explainability, and agent trace without forcing the technical layer into the primary product experience. It also includes loading/error handling, keyboard-focus support, and a no-login path for judges. Session-defining controls lock while a live request is running; editing an anchor/category/context invalidates stale output and pending match confirmation; and the browser refuses to show a review card or label a 200 response **LIVE QLOO** unless the normalized request receipt matches the initiating form; successful results must also have `qloo-live` provenance, a valid generation timestamp, and the same Qloo API origin as the verified status endpoint.

### Potential Impact

The product targets a concrete workflow: senior-living activity staff and families often know only fragments of a person's preferences. Resonance reduces the work required to translate those fragments into culturally coherent engagement ideas while leaving the final choice with the human facilitator.

### Visible Qloo differentiation

The anchor-only baseline is deliberately competent rather than a strawman: it can reuse the literal favorites and their category hints, but it cannot claim adjacent tastes. The Qloo side displays the real selected taste signals and quantifies how many selected discoveries were not named in the inputs and how many activities they influenced. A judge can therefore see what Qloo uniquely adds with the same starting inputs.

### Quality of the Idea

Instead of using Qloo for a conventional shopping or entertainment recommendation list, Resonance uses cultural affinity as evidence inside a human-facilitated engagement agent. The output is not a prediction about a person; it is an explainable starting point that a facilitator can accept, modify, or reject.

## Reproducibility evidence

- Public source: https://github.com/P00NSMASHER/resonance-qloo
- Verified live Qloo artifact: [LIVE_QLOO_EVIDENCE.json](LIVE_QLOO_EVIDENCE.json)
- Verified review-gated Qloo artifact: [LIVE_QLOO_REVIEW_EVIDENCE.json](LIVE_QLOO_REVIEW_EVIDENCE.json)
- Submission evidence: [SUBMISSION_EVIDENCE.md](SUBMISSION_EVIDENCE.md)
- Known limitations: [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)
- API contract: [../openapi.yaml](../openapi.yaml)
- Official Qloo MCP proof path: `npm run qloo:proof -- "classic jazz vocals"`

Both the exact-match public Qloo path and the signed non-exact review-gated path are verified end-to-end and captured in committed redaction-safe artifacts.
