# Exact Floot production source

This directory is a public snapshot of the **actual Floot source** for Resonance, captured from Floot project version `1792675362099`. Source capture and publication are separate: `BUILD_RECEIPT.json` records the last verified published version.

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

On October 22, 2026 UTC, all 33 manifested runtime files were directly read from Floot version `1791670843967`. Each file was reconstructed in complete line chunks and checked against the source character count reported by Floot. The only differences from the preceding repository snapshot were terminal whitespace in three files.

The photographic editorial refresh then changed only `pages/_index.tsx` and `pages/_index.module.css`. Both files were fully reread from Floot version `1792633710338` and matched the written source byte-for-byte: 48,585 and 58,744 characters respectively. The final CSS-only mobile readiness fix was appended at version `1792675362099`; its ending lines were directly reread and matched against the complete 59,128-character staged file, whose preceding content was unchanged. The TSX file remained unchanged. The remaining 27 runtime files retain the complete direct capture. The committed snapshots use canonical LF endings, as required by the parity verifier.

That point-in-time source receipt is stored in `manifest.json`. CI verifies the receipt belongs to the same Floot project version and covers the complete manifested runtime slice. CI does not have private Floot-source access; public deployment freshness remains independently checked through the live deployment contract/parity probe. Capturing a source version does not by itself establish that it is publicly deployed.

## Red-team semantic and UX remediation — candidate release

Floot version `1792675362099` has a new `helpers/safePlan.tsx` module. It prevents misleading positional signal attribution, allows anchor-only steps when an aggregate genre is incompatible, retains unselected raw signals, and preserves ambiguity review. Source snapshot contains 30 runtime files; all five new/modified files were reconstructed in numbered chunks and compared to their recorded source lengths and Git blobs. The publisher has not yet attested this candidate as a live release.

## 100-scenario feedback remediation — source candidate

Version `1792675362099` includes Facilitator Studio (client-side accessibility presets, consent, preference status, mixed opt-in group tracks, 5/10/15-minute micro-plans, English/Spanish draft guidance, rights-aware media choices, independent offline TXT/HTML/one-page run-sheet export, versioned JSON handoff, limited local anonymous theme tags, import validation and shared-device deletion controls). All outputs remain human-reviewed cultural activity guidance, not clinical recommendations. Twenty synthetic contexts were reviewed; no real user responses are claimed. This snapshot must be published and then verified separately before claiming live acceptance.

## Follow-up declined-topic fix

Version 1792675362099 aligns visible A/B group choices with neutral exported handoffs after a facilitator declines an activity. Original Qloo evidence stays in the review/audit panel; a declined favorite is no longer repeated in the on-screen subgroup track. Browser verification will run against the published release.
