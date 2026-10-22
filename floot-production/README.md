# Exact Floot production source

This directory is a public snapshot of the **actual Floot source** for Resonance, captured from Floot project version `1792634790861`. Source capture and publication are separate: `BUILD_RECEIPT.json` records the last verified published version.

- Floot project ID: `49082a23-f25f-41f4-a147-f908c8dcc860`
- Published URL: https://resonance-qloo.floot.app
- Deployment contract: `2026-10-02.review-origin-v1`
- Qloo event API origin: `https://hackathon.api.qloo.com`

## Scope

The snapshot contains every runtime file directly involved in the public Resonance experience plus the anonymous Phase 5 validation surface:

- public page, photographic editorial artwork references and responsive styling;
- recommendation and status endpoint handlers plus schemas;
- shared Qloo parsing/selection/session logic;
- directly imported Button/Input/Select/Badge components and styles;
- global provider/config glue and base CSS;
- anonymous study page, guarded response endpoint/schema, and supporting UI dependency;
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

On October 22, 2026 UTC, all 29 manifested runtime files were directly read from Floot version `1791670843967`. Each file was reconstructed in complete line chunks and checked against the source character count reported by Floot. The only differences from the preceding repository snapshot were terminal whitespace in three files.

The photographic editorial refresh then changed only `pages/_index.tsx` and `pages/_index.module.css`. Both files were reread from Floot version `1792634790861` and matched the written source byte-for-byte: 48,585 and 59,128 characters respectively. The remaining 27 runtime files retain the complete direct capture. The committed snapshots use canonical LF endings, as required by the parity verifier.

That point-in-time source receipt is stored in `manifest.json`. CI verifies the receipt belongs to the same Floot project version and covers the complete manifested runtime slice. CI does not have private Floot-source access; public deployment freshness remains independently checked through the live deployment contract/parity probe. Capturing a source version does not by itself establish that it is publicly deployed.
