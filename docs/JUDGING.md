# Judge guide

## 60-second evaluation path

1. Open the live app: https://resonance-qloo.floot.app
2. Confirm the header reports whether Qloo is actually connected.
3. If the event credential is still pending, use **Preview with example data**. The result is visibly labeled **ILLUSTRATIVE DEMO**.
4. Once Qloo is connected, enter 2–4 cultural favorites and run the live agent.
5. Inspect:
   - the result metadata strip: source mode, evidence basis, non-secret Qloo API origin, and live generation timestamp;
   - resolved Qloo entity IDs, category hints, and whether each resolution is an **Exact name** or **Qloo top match · review**;
   - the visible aggregate handoff from resolved favorites into Qloo taste analysis;
   - the returned taste evidence, including the **selected / returned** signal count;
   - the selection rule: highest real numeric Qloo affinities when enough scores exist, otherwise Qloo's returned rank order with no invented percentage;
   - numbered **Plan signal #N** badges that identify exactly which returned signals were selected (up to four);
   - when only three signals are usable, the visible **No synthetic signal** note explaining that signal #3 is reused for the closing step;
   - the four-stage agent decision trace;
   - the four-step session, where the same signal numbers reappear beside the activities they drive;
   - each step's evidence-backed "why it fits" explanation;
   - the exported session audit trail, which preserves source mode, generation time, Qloo IDs, resolution path, evidence basis, explainability availability, selected-versus-returned counts, numbered selected signals, target duration, and agent trace.

## Judging-criteria mapping

### Technological Implementation

Qloo is not an ornamental API call. It supplies the entity-resolution and cross-category taste evidence that drives the agent.

The implementation now matches current Qloo public documentation more defensibly:

- Search results are resolved to Qloo entity UUIDs (with entity-URN fallback).
- Category-aware search can constrain ambiguous anchors through Qloo's documented `types` parameter.
- The agent reports how many category hints were actually applied and preserves them beside the resolved anchors.
- Resolution is not presented as hidden confidence: each resolved entity is classified as an exact normalized-name match or a Qloo top-result match that should be reviewed. Top-result matches visibly warn the facilitator and the same review evidence is preserved in exports.
- Independent anchor-resolution calls run concurrently to reduce live latency.
- Those IDs are passed to `signal.interests.entities` for taste analysis.
- Live status and recommendation provenance expose the non-secret Qloo API origin, allowing judges to verify that event traffic is using the hackathon gateway without exposing the credential.
- Tag results are read from `results.tags`.
- Numeric affinity values are used only if Qloo actually returns them.
- Taste analysis requests Qloo's documented `feature.explainability=true`. Resonance reports how many returned taste results actually contain non-empty `query.explainability` metadata and whether aggregate explainability is present; it does not invent attribution when Qloo omits it.
- If a tag result is rank-ordered but unscored, Resonance preserves that Qloo order and displays **Rank #N** instead of manufacturing a percentage.
- The service retains up to eight returned affinity signals for inspection while the agent selects at most four for the four-step plan.
- The selected-signal sequence is explicit and stable: the UI labels chosen evidence with stable **Plan signal #N** numbering (up to four selected signals), repeats those numbers on the corresponding activity cards, and preserves the same mapping in copied session evidence.
- Returned-but-unselected signals remain visible as **Additional evidence** instead of disappearing from the audit path.
- Fewer than three usable affinity signals fail closed. If exactly three selected signals support the four-step plan, the closing step reuses the last real selected signal and the UI/export explicitly says no synthetic fourth signal was created.

The server also keeps the event credential private, bounds inputs, times out upstream calls, and exposes an inspectable agent trace.

### Design

The app is one focused, responsive flow with live connection-state awareness, visible provenance, explicit rank-vs-score labeling, loading/error handling, keyboard-focus support, and a no-login path for judges.

### Potential Impact

The product targets a concrete workflow: senior-living activity staff and families often know only fragments of a person's preferences. Resonance reduces the work required to translate those fragments into culturally coherent engagement ideas while leaving the final choice with the human facilitator.

### Quality of the Idea

Instead of using Qloo for a conventional shopping or entertainment recommendation list, Resonance uses cultural affinity as evidence inside a human-facilitated engagement agent. The output is not a prediction about a person; it is an explainable starting point that a facilitator can accept, modify, or reject.

## Reproducibility evidence

- Public source: https://github.com/P00NSMASHER/resonance-qloo
- Submission evidence: [SUBMISSION_EVIDENCE.md](SUBMISSION_EVIDENCE.md)
- Known limitations: [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)
- API contract: [../openapi.yaml](../openapi.yaml)
- Official Qloo MCP proof path: `npm run qloo:proof -- "classic jazz vocals"`

The live Qloo path should not be treated as verified until the event-issued key arrives and a real end-to-end call is captured.
