# Resonance judge red-team remediation — candidate release

## Scope and evidence quality

These changes address the October 22 red-team findings. This document does NOT claim superior effectiveness, measured time savings, participant improvements, or human study outcomes. Qloo affinities are aggregate tastes for the group of supplied anchors; the Qloo API response does not guarantee any given signal belongs to any one anchor.

## Repairs staged

- **Unsupported association:** a new deterministic semantic guard refuses to attach a session-wide genre to a culturally incompatible favorite. An activity can be anchor-only while other selected Qloo signals shape separate optional activities. The full returned evidence remains visible.
- **Malformed source tags:** malformed/irrelevant leading labels (including `+young Adult`) remain in source evidence, but are excluded from selected activities. Less than three usable genres fails closed instead of inventing evidence.
- **Native explainability:** no missing Qloo explainability metadata is manufactured. UI describes session-level evidence rather than individual per-anchor causality.
- **Score display:** interleaved genre-family results are shown by rank rather than percentages; numeric source scores, when used, are explicitly labeled as non-probability values.
- **Clipboard/export:** manual text selection plus a TXT download fallback; optional private local browser saved-plan list. These contain cultural favorites, so users should avoid entering identifiers or health information. No server-side saved-plan database is introduced.
- **User flow:** session builder comes before editorial card gallery; each card selects a specific input category rather than acting as an indistinguishable jump link. Study invitation is an optional footer link.
- **Imagery:** six live images have been compressed from original multi-megabyte PNG files to WebP assets in the 69–211 KB range, with accessible source descriptions and lazy loading where appropriate.

## Validation evidence

- Floot preview typechecks clean. Five spec suites passed, including 20 diverse synthetic pairing fixtures.
- A live-credential preview request for **The Hobbit (Book) + Kyoto (Destination)** correctly returned HTTP 409 for a non-exact book title; signed confirmation returned HTTP 200. The generated Kyoto activity does **not** pair the city to `Science Fiction & Fantasy`. Returned `+young Adult` was retained as unselected source evidence; selected genres were Fiction, Science Fiction & Fantasy, Classics, and Literature.
- A later four-case concurrency sweep was inconclusive: three upstream Qloo-rate-limit responses (429), one legitimate 422 insufficient-evidence rejection. No result was called successful. No further quota-intensive retries were scheduled.
- The script `npm run quality:benchmark` compares a literal anchor-only baseline with the four-step deterministic plan across 20 synthetic scenario fixtures. It tests structural safety, specificity, evidence labeling and 30-minute timing. It does **not** evaluate plan superiority or real people.

## Production release verified

Floot published the restored candidate at **2026-10-22 05:53 UTC**. Public version 1792638043317 passed direct canonical Qloo and signed ambiguous-name Qloo verification on the published URL, not only on the preview. Details are in `BUILD_RECEIPT.json`; the prior gallery run remains historically labeled. The next release gates are GitHub merging, browser-based copy/download/mobile acceptance and Devpost gallery freshness. These are distinct from real-user evaluation.

## Still genuinely pending

- Obtain 3–5 voluntary consenting eligible activity professionals/family caregivers, collect their private receipts via the existing `/study` path, and analyze without altering negative responses or inventing participants. Current validated real-user count: **0**.
- Obtain independent qualitative judgments against a baseline and report both losses and wins. Do not claim efficacy without them.
- Merge exact-source parity gates, complete public keyboard/mobile and copy/download acceptance, and refresh the Devpost gallery. Production canonical and signed-review Qloo tests passed; the other acceptance steps must be verified individually.
