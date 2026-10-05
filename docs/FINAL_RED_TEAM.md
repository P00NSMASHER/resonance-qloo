# Pre-repair three-judge red-team (historical)

Status: **Superseded by [`FINAL_THREE_JUDGE_AUDIT.md`](./FINAL_THREE_JUDGE_AUDIT.md).**
This snapshot is retained to show the issues found before the durable screenshot
set, documentation reconciliation, and final independent audits. Its gallery
blocker and scores are not the current state.

Date: 2026-10-04

This audit is intentionally adversarial. It does **not** freeze the project.

Official rubric: Technological Implementation, Design, Potential Impact, Quality of the Idea.

## Judge A — technical skeptic

| Area | Score | Reason |
|---|---:|---|
| Technological Implementation | 99 | Qloo is central; exact production source is public; exact/review-gated live artifacts exist; signed review receipts, fail-closed evidence rules, caching, secret scanning, parity, CI, and provenance are unusually strong. Qloo evidence now changes session strategy through deterministic archetypes. |
| Design | 96 | Judge-first hierarchy and progressive disclosure substantially reduce evidence overload; facilitator controls are concrete. Gallery screenshots are still missing from Devpost. |
| Potential Impact | 78 | Specific audience and controlled study exist, but zero real external responses are currently counted. |
| Quality of the Idea | 99 | Visible anchor-only vs Qloo comparison demonstrates a non-obvious, material Qloo contribution; Qloo now changes strategy and activity content. |

**Technical judge overall: 93/100.**

Remaining objection: impact evidence is not externally validated; current exact-head CI must remain green after the latest changes.

## Judge B — product/design skeptic

| Area | Score | Reason |
|---|---:|---|
| Technological Implementation | 97 | More depth than needed for a hackathon product; implementation is credible and reproducible. |
| Design | 96 | Default result is now Your favorites → What Qloo discovered → Your session; audit details are on demand; controls are human-readable and mobile-sized. Missing Devpost gallery screenshots reduce presentation completeness. |
| Potential Impact | 77 | The workflow is credible, but the submission cannot yet show observed time savings, usefulness ratings, or reuse intent from target users. |
| Quality of the Idea | 98 | Strong problem/solution fit and human-control model. Canonical demo was selected by a transparent full-output audit rather than hidden cherry-picking. |

**Product judge overall: 92/100.**

Remaining objections: no real participant evidence; no three-image visual gallery.

## Judge C — Qloo/sponsor skeptic

| Area | Score | Reason |
|---|---:|---|
| Technological Implementation | 100 | Search, insights, explainability request, origin verification, signed non-exact confirmation, exact production source, live artifacts, and evidence accounting make Qloo usage indisputable. |
| Design | 96 | Qloo's contribution is now visible without forcing judges into UUIDs/provenance; evidence remains inspectable. |
| Potential Impact | 79 | Clear audience and use case, but sponsor still has to trust the impact hypothesis until real target users complete the controlled task. |
| Quality of the Idea | 100 | Same-input anchor-only vs Qloo comparison directly answers whether Qloo uniquely enables the experience; archetype selection makes Qloo change strategy, not just labels. |

**Sponsor judge overall: 94/100.**

## Severe blockers to the requested 95+ / all-three threshold

### 1. Real target-user evidence — BLOCKING

Current valid external participant count claimed in submission evidence: **0**.

Required to clear:
- 3–5 real eligible participants;
- standardized baseline and Resonance task;
- actual measured times and ratings;
- deterministic aggregation;
- only observed metrics published.

No synthetic/test/developer response may count.

### 2. Devpost gallery — BLOCKING DESIGN COMPLETENESS

Three real screenshots are specified in `docs/GALLERY_SCREENSHOT_PLAN.md`, but capture is externally blocked:
- TinyFish wallet balance is negative;
- local sandbox Chromium cannot reach the public app;
- Floot screenshot tool needs an open editor/preview window.

No generated/mock screenshot should substitute for the live product.

## Non-blocking checks before final freeze

- exact-head GitHub CI green;
- Floot production `live/ready`;
- exact Floot production snapshot parity green after every live source edit;
- Devpost description remains aligned with the live app;
- current live artifact remains redaction-safe;
- no unverified impact claim appears anywhere.

## Freeze decision

**DO NOT FREEZE.**

The product/engineering work is at or near the 95+ threshold. The remaining score ceiling is external evidence/presentation, not another backend feature.
