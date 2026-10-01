# Resonance

[![CI](https://github.com/P00NSMASHER/resonance-qloo/actions/workflows/ci.yml/badge.svg)](https://github.com/P00NSMASHER/resonance-qloo/actions/workflows/ci.yml)

**Qloo-powered cultural intelligence for more personal human connection.**

Live demo: https://resonance-qloo.floot.app  
Devpost: https://devpost.com/software/resonance-nud9ek

Resonance turns a handful of known cultural favorites—an artist, film, restaurant, brand, book, or place—into a culturally coherent engagement plan for senior-living activity teams and families.

## 60-second judge path

1. Open the live demo.
2. Check the connection indicator in the header.
3. If the event credential is still pending, use **Preview interface**; it is explicitly marked **ILLUSTRATIVE DEMO**.
4. Once Qloo is connected, enter 2–4 cultural favorites and run the live agent.
5. Inspect the resolved anchors, cross-category affinity signals, four-part session, and the explanation for why each step fits.

For a criterion-by-criterion walkthrough, see [docs/JUDGING.md](docs/JUDGING.md).

## Why Qloo is essential

A generic LLM can generate plausible activity ideas, but it cannot reliably ground them in structured cross-category cultural affinities. Resonance uses Qloo as the core signal:

1. Resolve 2–4 cultural anchors to Qloo entities.
2. Query Qloo for cross-category affinity signals.
3. Normalize and deduplicate those signals.
4. Build a four-part engagement session adapted to energy and setting.
5. Show the evidence and explain why each step fits.

When no event API key is connected, the UI **does not fabricate live Qloo results**. It switches to a clearly labeled illustrative preview.

## Current hackathon status

- Created after the Qloo Agentic Hackathon submission period opened.
- Public live demo is deployed.
- Event-issued Qloo API credential has been requested and is pending.
- Live-Qloo action stays disabled until the server detects the credential.
- MIT licensed and open source.
- CI verifies typecheck, unit tests, production build, and the no-key preview/fail-closed path.

## Architecture and trust model

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the browser/server/Qloo trust boundaries and [SECURITY.md](SECURITY.md) for secret handling and data-minimization rules.

At a glance:

- The browser never receives the Qloo API key.
- `GET /api/status` exposes only connection state.
- `POST /api/recommend` validates and bounds user input before calling Qloo.
- Upstream requests time out rather than hanging indefinitely.
- The server fails closed when Qloo returns too little evidence.
- Demo and live results are separate provenance states.

## Tech

- React 19
- TypeScript
- Vite
- Node HTTP server
- Qloo Search + Insights API
- Vitest
- GitHub Actions

## Local setup

Requires Node 20+.

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

In a second terminal, run the web client:

```bash
npm run dev:web
```

Then open http://localhost:5173.

## Test and build

```bash
npm run typecheck
npm test
npm run build
npm run smoke:preview
```

The smoke test starts the production server without a Qloo key and verifies:

- preview status is reported correctly;
- live recommendations fail closed with HTTP 503;
- unknown API routes return HTTP 404.

For a production-style run:

```bash
npm run build
npm start
```

The server serves the built frontend from `dist/` and exposes:

- `GET /api/status`
- `POST /api/recommend`

## API behavior

`GET /api/status` reports whether Qloo is connected. The frontend uses it to avoid claiming live functionality when the credential is missing.

`POST /api/recommend` accepts:

```json
{
  "anchors": ["Ella Fitzgerald", "Singin' in the Rain", "Italian food"],
  "energy": "calm",
  "setting": "small-group"
}
```

The server keeps the Qloo credential private, resolves cultural anchors through Qloo, requests cross-category insights, and returns:

- resolved Qloo anchors,
- affinity labels and normalized scores,
- a four-part engagement session,
- rationale for each step.

## Privacy and scope

- No personal identifiers are required.
- Resonance is not a medical tool and gives no medical advice.
- Qloo results are treated as cultural-affinity signals, not claims about identity or future behavior.
- Human facilitators remain in control of the final activity choices.

## License

MIT — see [LICENSE](./LICENSE).
