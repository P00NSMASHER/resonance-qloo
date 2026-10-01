# Architecture

Resonance is split into three trust zones plus an explicit agent-orchestration layer.

## Browser

The React client collects 2–4 cultural anchors plus an energy and setting preference. It never receives the Qloo credential.

Before enabling the live action, the client calls `GET /api/status`. When the server has no event-issued credential, the live button remains disabled and the UI exposes only a clearly labeled illustrative preview.

Live results expose:

- resolved anchors;
- Qloo taste evidence;
- whether evidence is based on numeric scores or ranked result order;
- an agent decision trace;
- the generated session and why-it-fits rationales.

## Resonance server

The server owns the Qloo credential and provides two routes:

- `GET /api/status`: reports only whether a credential is present.
- `POST /api/recommend`: validates a bounded request, resolves anchors through Qloo Search, requests Qloo tag insights, hands the evidence to the agent planner, and returns the plan plus trace/evidence metadata.

Safety/reliability controls:

- maximum 16 KB request body;
- 2–4 distinct, trimmed anchors;
- allowed-value validation for energy and setting;
- 8-second upstream timeout;
- fail-closed behavior when too few anchors or affinities are resolved;
- fail-closed behavior when explicit numeric evidence is too weak;
- no invented affinity score when the Qloo response supplies only ranked tags;
- no secret values in API responses;
- no-store JSON responses;
- static-path traversal protection.

## Qloo

The server uses the public Qloo API base documented by Qloo: `https://api.qloo.com`.

The current live path uses:

1. `GET /search` to resolve a cultural anchor.
2. The returned Qloo entity UUID as `signal.interests.entities`.
3. `GET /v2/insights?filter.type=urn:tag` for taste analysis.

Qloo's taste-analysis documentation says tag results are returned under `results.tags`. Resonance keeps their result order. If the payload includes a numeric `affinity` / `score`, it is normalized and used; if no score exists, the rank is retained and the UI says **Rank #N**.

The repository also contains an event-supported `qloo mcp` proof script. It checks `qloo_capabilities` and runs `qloo_find_tags` without exposing the event credential.

## Agent orchestration

The agent planner is deterministic and inspectable:

1. **Resolve** — require at least two Qloo-backed anchors.
2. **Evaluate** — choose the strongest evidence. Prefer numeric scores when at least three are present; otherwise preserve Qloo's ranked order.
3. **Compose** — adapt the four-step plan to the selected energy and setting.
4. **Explain** — return a visible rationale for every step.

Evidence metadata states its basis explicitly:

- `normalized-score`, or
- `ranked-order`.

A missing score is represented as `null`; it is never replaced with a made-up default.

## Output provenance

The UI maintains separate `live` and `demo` states. Demo affinities are illustrative placeholders and are explicitly labeled as such; they are never represented as Qloo API results.
