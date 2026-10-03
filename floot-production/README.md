# Exact Floot production source

This directory is a public snapshot of the **actual judge-facing Floot source** for Resonance, captured from Floot project version `1791023061990`.

- Floot project ID: `49082a23-f25f-41f4-a147-f908c8dcc860`
- Published URL: https://resonance-qloo.floot.app
- Deployment contract: `2026-10-02.review-origin-v1`
- Qloo event API origin: `https://hackathon.api.qloo.com`

## Scope

The snapshot contains every runtime file directly involved in the public Resonance experience:

- public page and responsive styling;
- recommendation and status endpoint handlers plus schemas;
- shared Qloo parsing/selection/session logic;
- directly imported Button/Input/Select/Badge components and styles;
- global provider/config glue and base CSS;
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
