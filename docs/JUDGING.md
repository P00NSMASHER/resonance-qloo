# Judge guide

## 60-second evaluation path

1. Open the live app: https://resonance-qloo.floot.app
2. Confirm the header reports whether Qloo is actually connected.
3. If the event credential is still pending, use **Preview interface**. The result is visibly labeled **ILLUSTRATIVE DEMO**.
4. Once Qloo is connected, enter 2–4 cultural favorites and run the live agent.
5. Inspect:
   - resolved anchors;
   - cross-category affinity scores;
   - the four-step session;
   - each step's "why it fits" explanation.

## Judging-criteria mapping

### Technological Implementation

Qloo is not an ornamental API call. It supplies the entity-resolution and cross-category affinity signals that drive the session. The server keeps the credential private, validates and bounds requests, times out upstream calls, and fails closed when the Qloo signal is insufficient.

### Design

The app is one focused, responsive flow with live connection-state awareness, visible provenance, loading/error handling, and a no-login path for judges.

### Potential Impact

The product targets a concrete workflow: senior-living activity staff and families often know only fragments of a person's preferences. Resonance reduces the work required to translate those fragments into culturally coherent engagement ideas.

### Quality of the Idea

Instead of using Qloo for conventional consumer recommendations, Resonance uses cultural affinity as an input to human-facilitated engagement. The output is not a prediction about a person; it is an explainable starting point that a facilitator can accept, modify, or reject.
