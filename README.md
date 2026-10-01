# Resonance

[![CI](https://github.com/P00NSMASHER/resonance-qloo/actions/workflows/ci.yml/badge.svg)](https://github.com/P00NSMASHER/resonance-qloo/actions/workflows/ci.yml)

**Qloo-powered cultural intelligence for more personal human connection.**

Live demo: https://resonance-qloo.floot.app  
Devpost: https://devpost.com/software/resonance-nud9ek

Resonance turns a handful of known cultural favorites—an artist, film, restaurant, brand, book, or place—into a culturally coherent engagement plan for senior-living activity teams and families.

## Why Qloo is essential

A generic LLM can generate plausible activities, but it cannot reliably ground those ideas in structured cross-category cultural affinities. Resonance uses Qloo evidence as the core signal, then runs an explicit agent loop:

1. resolve cultural anchors;
2. evaluate evidence strength;
3. select the strongest affinities;
4. adapt the session to the chosen energy and setting;
5. expose the decision trace and explain every recommendation.

If Qloo returns too little reliable evidence, the agent fails closed instead of fabricating confidence.

## 60-second judge path

1. Open the live demo.
2. Check the connection indicator in the header.
3. If the event credential is still pending, use **Preview interface**; it is explicitly marked **ILLUSTRATIVE DEMO**.
4. Once Qloo is connected, enter 2–4 cultural favorites and run the live agent.
5. Inspect:
   - resolved anchors,
   - cross-category Qloo taste evidence,
   - the agent decision trace,
   - the four-part session,
   - the why-it-fits rationale for every step.

See [docs/JUDGING.md](docs/JUDGING.md) for a criterion-by-criterion walkthrough.

## Official Qloo event-tooling proof

The Qloo starter kit lists `qloo mcp` as a supported event surface. Resonance includes a redaction-safe verification script:

```bash
npm install --global @qloo/qloo-harness
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

- Public live demo is deployed.
- Public MIT-licensed source repo is complete.
- GitHub recognizes the MIT license.
- CI covers typecheck, unit tests, production build, and preview/fail-closed smoke tests.
- OpenAPI 3.1 contract is public.
- Submission evidence and known limitations are documented.
- Event-issued Qloo credential has been requested and is still pending.
- Live-Qloo execution remains disabled until the credential is connected.

## Evidence and reproducibility

- [Submission evidence](docs/SUBMISSION_EVIDENCE.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Judge guide](docs/JUDGING.md)
- [Security](SECURITY.md)
- [OpenAPI contract](openapi.yaml)

## Tech

- React 19
- TypeScript
- Vite
- Node.js 22.19+
- Qloo Search + Insights integration
- Official Qloo MCP proof path
- Vitest
- GitHub Actions

## Local setup

```bash
git clone https://github.com/P00NSMASHER/resonance-qloo.git
cd resonance-qloo
npm install
cp .env.example .env
```

Add the **event-issued** Qloo key to `.env`:

```env
QLOO_API_KEY=your_event_key_here
```

Never commit the real key.

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

```bash
npm run typecheck
npm test
npm run build
npm run smoke:preview
```

The preview smoke test verifies:

- preview status when no key is connected,
- HTTP 503 fail-closed behavior for live requests without a key,
- HTTP 404 for unknown API routes.

## API

`GET /api/status` reports whether Qloo is connected.

`POST /api/recommend` accepts:

```json
{
  "anchors": ["Ella Fitzgerald", "Singin' in the Rain", "Italian food"],
  "energy": "calm",
  "setting": "small-group"
}
```

A successful live response includes:

- resolved Qloo anchors,
- affinity labels plus Qloo-provided scores when present, otherwise ranked result order,
- a four-part session,
- per-step rationale,
- an agent decision trace,
- an evidence summary.

## Privacy and scope

- No personal identifiers are required.
- Resonance is not a medical tool and gives no medical advice.
- Qloo results are treated as cultural-affinity signals, not claims about identity or future behavior.
- Human facilitators remain in control of final activity choices.

## License

MIT — see [LICENSE](./LICENSE).
