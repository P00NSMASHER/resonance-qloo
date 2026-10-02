# Resonance

[![CI](https://github.com/P00NSMASHER/resonance-qloo/actions/workflows/ci.yml/badge.svg)](https://github.com/P00NSMASHER/resonance-qloo/actions/workflows/ci.yml)

**Qloo-powered cultural intelligence for more personal human connection.**

Live demo: https://resonance-qloo.floot.app  
Devpost: https://devpost.com/software/resonance-nud9ek

Resonance turns a handful of known cultural favorites—an artist, film, restaurant, brand, book, or place—into a culturally coherent 30-, 45-, or 60-minute engagement plan for senior-living activity teams and families.

## Why Qloo is essential

A generic LLM can generate plausible activities, but it cannot reliably ground those ideas in structured cross-category cultural affinities. Resonance uses Qloo evidence as the core signal, then runs an explicit agent loop:

1. resolve cultural anchors;
2. evaluate evidence strength;
3. select the strongest affinities;
4. adapt the session to the chosen energy and setting;
5. expose the decision trace and explain every recommendation.

If Qloo returns too little reliable evidence, the agent fails closed instead of fabricating confidence.

### Category-aware resolution

Each anchor can optionally include a Qloo entity category such as Artist, Film, Book, Brand, Destination, Place, Podcast, TV Show, or Video Game. Resonance passes that hint through Qloo's documented `types` search parameter to reduce ambiguous matches. The chosen category is retained on the resolved-anchor evidence and counted in the agent trace, so judges can see when disambiguation was applied.

Independent anchor lookups run concurrently, reducing live latency without increasing the number of Qloo calls.

Resolved entities are also classified as either an **exact normalized-name match** or a **Qloo top-result match to review**. The UI does not turn that into a made-up confidence score. If a top result is non-exact, Resonance stops **before taste analysis**, shows the input → Qloo entity mapping, and requires the user to explicitly confirm those exact entity IDs or edit the anchors/category hints. Only confirmed matches can feed the taste-analysis step, and the confirmation is cleared if the inputs change.

### Qloo-native explainability

Taste analysis requests `feature.explainability=true`. Resonance does not assume or reinterpret Qloo's attribution schema: it records only whether Qloo actually returned non-empty per-result or aggregate `query.explainability` metadata. The live evidence panel shows that availability, while absent metadata stays absent rather than being simulated.

If Qloo returns HTTP 400/422 and the response detail specifically identifies the optional explainability feature as unsupported, Resonance retries the same bounded taste-analysis request once without that flag. Unrelated 400/422 validation failures are not retried or reinterpreted as an explainability compatibility issue.

## Live-mode truthfulness

A configured secret is **not** treated as proof that Qloo works.

`GET /api/status` now distinguishes:

- `preview` — no event credential is configured;
- `ready` — the credential is configured **and verified against Qloo**;
- `degraded` — a credential is configured but cannot be verified;
- `rate-limited` — verification is temporarily blocked by Qloo's rate limit.

The live button only becomes available in the verified `ready` state. This prevents the demo from advertising a live integration merely because an environment variable exists. Live status and recommendation provenance also expose the non-secret Qloo API origin so the event gateway can be audited without exposing the credential.

If a credential is configured but verification is `degraded` or `rate-limited`, the UI exposes **Retry Qloo verification**. Preview/no-credential mode does not show a retry control. That button calls `GET /api/status?refresh=1`, which invalidates only a cached degraded/rate-limited probe and performs a fresh bounded verification. A healthy cached `ready` state is never thrown away. Forced retries are separately capped at two per client per minute and twenty per server process per minute.

A later live recommendation can also invalidate the optimistic connection display: upstream Qloo rate limiting moves the UI to `rate-limited`, upstream 502/504 failures move it to `degraded`, and a malformed/inconsistent supposedly-live response also fails closed to `degraded`. Local public-demo throttling and valid “insufficient evidence” responses do **not** downgrade the Qloo connection state.

The browser independently checks successful recommendation provenance before showing **LIVE QLOO**: the response must declare `qloo-live`, include a valid generation timestamp, and report the exact same Qloo API origin returned by the verified status endpoint. Session-defining inputs are locked while a live request is in flight, and changing an anchor, category, energy, setting, or duration invalidates any prior result and pending entity confirmation so stale evidence cannot appear to belong to edited inputs.

## 60-second judge path

1. Open the live demo.
2. Check the connection indicator in the header.
3. If the event credential is still pending, use **Preview with example data**; it is explicitly marked **ILLUSTRATIVE DEMO**.
4. Once Qloo is verified, enter 2–4 cultural favorites and run the live agent.
5. Inspect:
   - resolved anchors, exact-vs-top-result classification, and the pre-taste confirmation step when needed,
   - cross-category Qloo taste evidence,
   - the agent decision trace,
   - the four-part session,
   - the why-it-fits rationale for every step,
   - the exported audit trail for provenance, the non-secret Qloo API origin, and numbered evidence.

See [docs/JUDGING.md](docs/JUDGING.md) for a criterion-by-criterion walkthrough.

## Official Qloo event-tooling proof

The Qloo starter kit lists `qloo mcp` as a supported event surface. Resonance includes a redaction-safe verification script:

```bash
npm install --global @qloo/qloo-harness
qloo --version # must be 0.1.26 or newer for the current event kit
qloo setup --qloo
npm run qloo:proof -- "classic jazz vocals"
```

The script:

- starts the canonical `qloo mcp` server,
- checks `qloo_capabilities`,
- verifies `qloo_find_tags` is available,
- runs a bounded request,
- redacts credential-like fields,
- prints a request-to-result artifact suitable for submission evidence.

The real event key must never be committed or pasted into a public artifact.

## Current hackathon status

- Resonance is formally **Submitted** to the Qloo Agentic Hackathon; the Devpost project record reports `submitted_at: 2026-10-02T08:25:09.325-04:00`. The submission remains editable while the window is open.
- Public live demo is deployed on Floot. GitHub `main` is the source of truth; after source changes, republish the Floot app before final judging so the public demo matches the reviewed head.
- Public MIT-licensed source repo is complete and GitHub recognizes the MIT license.
- Direct npm dependencies are pinned, `package-lock.json` is committed, and CI installs with `npm ci` before typecheck, tests, production build, smoke/self-tests, submission preflight, and the advisory public deployment parity check.
- OpenAPI 3.1 contract, submission evidence, known limitations, and finalization runbook are public.
- Event-issued Qloo credential has been requested and is still pending; no key-delivery message has been found yet.
- Live-Qloo execution remains disabled until the credential is configured, verified against the hackathon API origin, and captured end-to-end.
- Formal submission is complete, but judge-readiness remains provisional until live Qloo evidence and public deployment parity both pass.

## Evidence and reproducibility

- [Submission evidence](docs/SUBMISSION_EVIDENCE.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Judge guide](docs/JUDGING.md)
- [Finalization runbook](docs/FINALIZATION_RUNBOOK.md)
- [Security](SECURITY.md)
- [OpenAPI contract](openapi.yaml)

## Tech

- React 19
- TypeScript
- Vite
- Node.js 22.19+
- Qloo Search + Insights integration against the event hackathon API origin
- verified-Qloo status probe
- Official Qloo MCP proof path
- Vitest
- GitHub Actions

## Local setup

```bash
git clone https://github.com/P00NSMASHER/resonance-qloo.git
cd resonance-qloo
npm ci
cp .env.example .env
```

Add the **event-issued** Qloo key to `.env`. Hackathon keys only work against the event API origin, so keep both values:

```env
QLOO_API_KEY=your_event_key_here
QLOO_API_BASE_URL=https://hackathon.api.qloo.com
```

Never commit the real key. Resonance defaults to the hackathon origin and only accepts explicitly allowlisted Qloo API hosts. If Qloo introduces another organizer-approved gateway, add that host to the reviewed server allowlist and tests before using it; do not bypass the origin check with an arbitrary URL.

Run the API server:

```bash
npm run dev:server
```

In a second terminal:

```bash
npm run dev:web
```

Open http://localhost:5173.

## Verify

Run the full offline repository verification in one command:

```bash
npm run verify:offline
```

That command covers typecheck, unit tests, production build, preview/live-handshake smoke tests, deployment-checker self-tests, MCP-proof redaction self-tests, evidence-capture self-tests, and offline submission preflight.

After publishing or re-publishing the public app, also run:

```bash
npm run deployment:check
```

`deployment:check` verifies both sides of the public Floot deployment: `/api/status` must expose the Resonance contract and `https://hackathon.api.qloo.com` origin, and the public HTML/JavaScript bundles must contain the current judge-evidence UI markers. A reachable but stale frontend or backend therefore fails the check.

The smoke test verifies:

- preview status when no key is connected,
- HTTP 503 fail-closed behavior for live requests without a key,
- HTTP 404 for unknown API routes,
- a local HTTPS Qloo-backed live status probe,
- HTTP 409 before a non-exact Qloo top match is confirmed,
- zero taste-analysis calls before confirmation,
- HTTP 200 after the exact returned Qloo entity ID is confirmed,
- truthful reuse of the third selected signal when only three usable Qloo signals are returned.

## API

`GET /api/status` verifies whether Qloo is actually usable before reporting `ready`.

`POST /api/recommend` accepts:

```json
{
  "anchors": [
    {"query":"Ella Fitzgerald","type":"artist"},
    {"query":"Singin' in the Rain","type":"movie"},
    {"query":"Italian food","type":"any"}
  ],
  "energy": "calm",
  "setting": "small-group",
  "durationMinutes": 45
}
```

A successful live response includes:

- resolved Qloo anchors, category hints, and exact-name vs top-result classification,
- a review-required handshake before non-exact top results can be used for taste analysis,
- affinity labels plus Qloo-provided scores when present, otherwise ranked result order,
- first-class returned-versus-selected affinity counts,
- numbered selected signals preserved from evidence into plan steps and exports,
- returned-but-unselected signals retained as additional evidence,
- a four-part session,
- selectable 30-, 45-, or 60-minute timeboxing,
- per-step rationale,
- an agent decision trace,
- an evidence summary.

## Privacy and scope

- Use cultural entities/preferences only; do not send resident/client names, emails, account IDs, device identifiers, health information, location histories, or other personal data to Qloo.
- A public cultural entity may itself contain a person's name (for example, a favorite artist); that is distinct from identifying the person using the product.
- Resonance is not a medical tool and gives no medical advice.
- Qloo results are treated as aggregate cultural-affinity signals, not claims about identity, sensitive traits, causality, probability, or future behavior for an individual.
- Human facilitators remain in control of final activity choices.

## License

MIT — see [LICENSE](./LICENSE).
