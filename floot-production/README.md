# Exact Floot production source

This directory is a public snapshot of the **actual judge-facing Floot source** for Resonance, captured from Floot project version `1791060657641`.

- Floot project ID: `49082a23-f25f-41f4-a147-f908c8dcc860`
- Published URL: https://resonance-qloo.floot.app
- Deployment contract: `2026-10-02.review-origin-v1`
- Qloo event API origin: `https://hackathon.api.qloo.com`

## Scope

The snapshot contains every runtime file directly involved in the public Resonance experience plus the closed Phase 5 study notice:

- public page and responsive styling;
- recommendation and status endpoint handlers plus schemas;
- shared Qloo parsing/selection/session logic;
- directly imported Button/Input/Select/Badge components and styles;
- global provider/config glue and base CSS;
- closed study notice, historical schema, HTTP-410 response endpoint, and retained supporting UI dependency;
- Floot's deployed dependency manifest.

Floot's many **unused seeded component examples** are intentionally excluded because they do not participate in the Resonance runtime.

## Verification

`manifest.json` records the exact Git blob SHA for every captured Floot file. GitHub stores the same content-addressed blobs in this repository.

Run:

```bash
npm run floot:production:parity
```

The verifier:

1. recomputes every snapshot Git blob SHA;
2. checks the Floot project/version, published URL, Qloo origin, and deployment-contract version;
3. compares critical production invariants with the portable canonical implementation: Qloo Search/Insights parameters, signed review receipts, credential-scoped caches, evidence accounting, provenance, live status, and judge-facing UI markers.

This removes the need for judges to infer production behavior from a parallel implementation: the deployed Floot source is directly inspectable here.

## Live-byte verification receipt

On 2026-10-03, the Floot runtime snapshot was refreshed to project version `1791060657641`. Phase 5 external validation was intentionally skipped: `pages/study.tsx` is now a static no-collection closure notice and `endpoints/study-response_POST.ts` returns HTTP 410 without logging responses. Both files were directly re-read from Floot and replaced byte-for-byte; the other manifested files retain their prior direct-source receipts.

That point-in-time receipt is stored in `manifest.json`. CI verifies the receipt belongs to the same Floot project version and covers the complete manifested runtime slice. CI does not pretend to have private Floot-source access; public deployment freshness remains independently checked through the live deployment contract/parity probe.
