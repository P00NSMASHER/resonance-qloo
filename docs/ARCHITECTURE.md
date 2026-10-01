# Architecture

Resonance is split into three trust zones.

## Browser

The React client collects 2–4 cultural anchors plus an energy and setting preference. It never receives the Qloo credential.

Before enabling the live action, the client calls `GET /api/status`. When the server has no event-issued credential, the live button remains disabled and the UI exposes only a clearly labeled illustrative preview.

## Resonance server

The server owns the Qloo credential and provides two routes:

- `GET /api/status`: reports only whether a credential is present.
- `POST /api/recommend`: validates a small bounded request, resolves anchors through Qloo, requests cross-category insights, normalizes the result, and returns a four-step session.

Safety/reliability controls:

- maximum 16 KB request body;
- 2–4 distinct, trimmed anchors;
- allowed-value validation for energy and setting;
- 8-second upstream timeout;
- fail-closed behavior when too few anchors or affinities are resolved;
- no secret values in API responses;
- no-store JSON responses;
- static-path traversal protection.

## Qloo

The server calls Qloo Search to resolve named cultural anchors and Qloo Insights for cross-category affinity signals. The live Qloo path is intentionally unavailable until an event-issued credential is connected.

## Output provenance

The UI maintains separate `live` and `demo` states. Demo affinities are illustrative placeholders and are explicitly labeled as such; they are never represented as Qloo API results.
