# Architecture

Resonance is split into three trust zones plus an explicit agent-orchestration layer.

## Browser

The React client collects 2–4 cultural anchors plus an energy and setting preference. It never receives the Qloo credential.

Before enabling the live action, the client calls `GET /api/status`. The server does not equate “secret exists” with “Qloo works”: when a credential is present, it performs a small cached verification request to Qloo. The UI receives a bounded state only:

- `preview`;
- `ready`;
- `degraded`;
- `rate-limited`.

Only `ready` enables live recommendations.

The browser applies three gates to successful recommendations before rendering them as live. First, it verifies internal evidence consistency: returned/selected signal counts, selected-label membership/order, resolution accounting, the exact deterministic four-step signal mapping (including Signal #3 reuse when only three signals are selected), anchor-to-step mapping, canonical titles/timeboxes, and the four-stage trace must agree. Second, it binds the response to the submitted form: returned resolved anchors/category hints must be an ordered subset of the submitted anchors, and energy, setting, and duration must exactly match the request context. Third, `provenance.source` must be `qloo-live`, `provenance.apiOrigin` must exactly match the origin returned by the verified status endpoint, and `generatedAt` must be a valid timestamp. Session-defining controls are disabled during an in-flight live request. Any later edit to anchors, category hints, energy, setting, or duration clears generated output and pending entity confirmation so an old response cannot be mistaken for evidence about the edited form.

Live results expose:

- resolved anchors, their Qloo IDs/category hints, and exact-name vs top-result classification;
- an explicit confirmation gate for non-exact Qloo top-result matches before taste analysis;
- the aggregate handoff from confirmed resolved favorites into Qloo taste analysis;
- all retained Qloo taste evidence, up to eight distinct signals;
- first-class returned-versus-selected signal counts;
- the explicit selection rule and evidence basis: numeric scores or Qloo rank order;
- numbered selected **Plan signal #N** evidence (up to four selected signals) plus unselected **Additional evidence**;
- an agent decision trace;
- the generated session, where the same signal numbers reappear beside the activities they drive;
- evidence-backed why-it-fits rationales.

## Resonance server

The server owns the Qloo credential and provides two routes:

- `GET /api/status`: reports whether the key is configured and whether Qloo was actually verified; probe results are cached for five minutes.
- `POST /api/recommend`: validates a bounded request and resolves anchors through Qloo Search. If any first valid Qloo result is not an exact normalized-name match, the route returns HTTP 409 with those resolved candidates and stops **before** taste analysis. A second request may carry the explicitly confirmed entity IDs; only then does the server request Qloo tag insights, hand the evidence to the agent planner, and return the plan plus trace/evidence metadata.

Safety/reliability controls:

- maximum 16 KB request body;
- public request-shape validation before any Qloo call: unsupported fields, malformed anchors, more than four anchors, invalid energy/setting/duration, or malformed confirmation IDs return HTTP 400 instead of being silently ignored, truncated, or defaulted;
- 2–4 distinct, trimmed anchors after normalization;
- allowed-value validation for energy and setting;
- 8-second timeout on each individual upstream Qloo call;
- a 12-second browser status-request budget, safely above the server's 8-second Qloo connectivity probe cap so a slow-but-valid verification does not falsely degrade the UI;
- a 28-second browser end-to-end live-request budget, which allows the bounded resolve → insights path plus the single explainability-compatibility retry without letting the browser abort a valid server request early;
- per-client and per-process aggregate live-request ceilings;
- bounded TTL caches for repeated Qloo searches/taste analysis, scoped to a non-secret fingerprint of the active Qloo credential so a key rotation cannot inherit evidence cached under a previous credential;
- in-flight coalescing for identical cache keys, so simultaneous judges do not duplicate the same Qloo Search, Insights, or connectivity-probe call before the first response fills the cache;
- cached credential verification so page loads do not repeatedly burn quota;
- a manual verification retry path for configured `degraded`/`rate-limited` states that invalidates only the cached non-ready probe; preview/no-credential mode has no retry control, healthy cached `ready` state is retained, and forced retries are separately bounded to two per client per minute and twenty per server process per minute;
- client-side connection-state downgrades when an actual live recommendation exposes upstream Qloo rate limiting/failure or fails the live evidence/provenance contract, while local application throttles and valid sparse-evidence responses remain scoped to the individual request;
- explicit user confirmation before any non-exact Qloo top-result entity is used in taste analysis;
- confirmation IDs are matched against the entity IDs produced by the current resolution pass, so a changed Qloo result must be reviewed again;
- fail-closed behavior when too few anchors or affinities are resolved;
- fail-closed behavior when explicit numeric evidence is too weak;
- no invented affinity score when the Qloo response supplies only ranked tags;
- no secret values in API responses;
- no-store JSON responses;
- static-path traversal protection.

## Qloo

The Agentic Hackathon build defaults to the event Qloo API origin required by the starter instructions: `https://hackathon.api.qloo.com`. `QLOO_API_BASE_URL` is configurable only across an explicit allowlist of reviewed Qloo API hosts (`hackathon.api.qloo.com` and `api.qloo.com`). Trusted Qloo hosts must use the standard HTTPS port and credential-bearing requests use fetch redirect mode `error`, so the key cannot follow an upstream redirect to another origin. Loopback HTTPS is available solely behind the local smoke-test flag, and the server disables that escape hatch when `NODE_ENV=production`. A new organizer-approved gateway requires an intentional allowlist-and-test change rather than an arbitrary environment override.

The current live path uses:

1. `GET /search` to resolve a cultural anchor.
2. The returned Qloo entity UUID as `signal.interests.entities`.
3. `GET /v2/insights?filter.type=urn:tag` for taste analysis.
4. `feature.explainability=true` so Qloo may return attribution metadata when available. Because that feature flag is optional rather than required for the core taste result, an HTTP 400/422 validation rejection triggers one bounded retry of the same Insights query without the explainability flag; authentication, quota, redirect, and server errors are never retried through this fallback.
5. `GET /v2/tags/types?take=1` as the lightweight credential/connectivity probe.

Qloo's taste-analysis documentation says tag results are returned under `results.tags`. Resonance keeps their result order. If the payload includes a numeric `affinity` / `score`, it is normalized and used; if no score exists, the rank is retained and the UI says **Rank #N**.

The repository also contains an event-supported `qloo mcp` proof script. It checks `qloo_capabilities` and runs `qloo_find_tags` without exposing the event credential.

## Agent orchestration

The agent planner is deterministic and inspectable:

1. **Resolve** — require at least two Qloo-backed anchors and classify each as an exact normalized-name match or a Qloo top-result match.
2. **Confirm when needed** — if any resolution is a non-exact top result, stop before taste analysis and require the user to confirm those exact Qloo entity IDs or edit the anchors/category hints.
3. **Evaluate** — retain up to eight returned affinity signals, then select at most four for the plan. Prefer the highest numeric scores when at least three are present; otherwise preserve Qloo's ranked order.
4. **Compose** — adapt the four-step plan to the selected energy and setting while preserving the selected signal sequence as stable **#1–#N** numbering (up to four selected signals). If only three real signals are available, signal #3 is reused for the closing activity rather than synthesizing a fourth evidence item.
5. **Explain** — return a visible rationale for every step.

Evidence metadata states its basis explicitly:

- `normalized-score`, or
- `ranked-order`.

It also records `returnedAffinityCount`, `selectedAffinityCount`, and the ordered `selectedAffinityLabels`. That lets the UI and exported audit trail show the full evidence funnel without recomputing it from presentation state.

The presentation layer keeps an interpretation boundary beside that evidence: Qloo affinities are aggregate cultural relationships, not probabilities, causal claims, or claims about an individual. The generated plan remains facilitator-reviewed output, not an inferred personal profile.

A missing score is represented as `null`; it is never replaced with a made-up default.

## Output provenance

The UI maintains separate `live` and `demo` states. Demo affinities are illustrative placeholders and are explicitly labeled as such; they are never represented as Qloo API results.
