# Qloo Agentic Hackathon: final submission gate

Verified against the public [challenge requirements](https://qloo.devpost.com/) and [official rules](https://qloo.devpost.com/rules) on October 8, 2026. Deadline: **October 30, 2026 at 11:45 PM EDT**. Judging is scheduled for **November 2–16, 2026**. This is a release checklist, not proof that any authenticated Devpost form was submitted or edited today.

## Required submission material

| Requirement | Evidence / decision | Status |
| --- | --- | --- |
| Public, functional externally hosted application | https://resonance-qloo.floot.app, live Qloo status and recommendation verified | Verified |
| Public source code | https://github.com/P00NSMASHER/resonance-qloo, repository visibility public | Verified |
| Source, original assets and run instructions | README setup, portable React source, exact Floot snapshot, `public/brand/` original PNG/SVG files | Verified after this PR merges |
| Open-source license detectable in GitHub repository | GitHub repository metadata reports `MIT`; `LICENSE` present | Verified |
| Project description explaining Qloo role | [Copy-ready, evidence-honest narrative](DEVPOST_SUBMISSION_2026.md) | Ready to apply |
| Actual application screenshots | [Permanent desktop/iPhone/Qloo gallery](judge-gallery/README.md) with hash manifest | Verified after this PR merges |
| Submitted Devpost project metadata | Existing [Resonance project](https://devpost.com/software/resonance-nud9ek) returned HTTP 200; earlier October 2 account record indicated Submitted | **Authenticated current status not reverified** |
| Current story and screenshot links reflected on Devpost | Updated text/captures prepared in this repository; no authenticated mutation was performed | **Entrant action required** |
| Demo video | The 2026 hackathon explicitly says video is **not required** | Not a blocker |

## October 8 public Devpost synchronization audit

The public Devpost entry still describes **older unfiltered Qloo tags** (including Reporter/Inventive), a previous source-snapshot size, and older branding. The latest public GitHub release has moved to filtered music/media genre signals, concrete facilitator cues, and the Cultural Atlas identity.

- **Ready-to-paste Devpost fields, Story and durable image links:** [DEVPOST_EDIT_PACKET.md](DEVPOST_EDIT_PACKET.md).
- **Read-only public story drift check:** `npm run submission:devpost:check`. Returns nonzero when the public story has not been refreshed, without modifying Devpost. The offline parser self-test `npm run submission:devpost:selftest` is part of CI.
- **Account blocker:** The available connected browser could not establish owner/editor access, and no connected saved browser profile advertises a Devpost login. No Devpost account mutation or authenticated status verification occurred.
- A public project page, an old green Submitted record, and this documentation do not replace visiting the contest's **My projects → Edit project** entry in the actual owner's account.

## Required entrant-side completion

1. Log into the existing [Resonance Devpost entry](https://devpost.com/software/resonance-nud9ek) using the owner's authorized account.
2. Confirm this entry is joined to the **Qloo Agentic Hackathon** and is in **Submitted** status rather than Draft. Historical submission state alone is not a substitute for checking it now.
3. Paste the refreshed narrative in [DEVPOST_SUBMISSION_2026.md](DEVPOST_SUBMISSION_2026.md), retaining accurate Qloo details and the explicit zero-real-user limitation.
4. Use the seven permanent source-controlled screenshots instead of older historical imagery or seven-day GitHub Actions artifacts. Their direct URLs follow `https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/<filename>` once merged.
5. Confirm demo URL, public GitHub repository, project start date (September 30, 2026), and discoverable MIT license.
6. Save/update the entry **before October 30 at 11:45 PM EDT**, then open its public page in a private browser session to verify links and text. Any site-specific forms or required checkboxes must be completed by the authorized entrant.
7. Maintain the live app and repository access throughout judging; avoid changing substantive submitted artifacts after the deadline unless the rules permit.

## Four equally weighted judging dimensions

**Technological implementation:** The live Qloo `/search` → `/v2/insights` workflow resolves and reviews actual entity IDs, preserves independent genre ranks, returns provenance, and fails closed on insufficient or inconsistent evidence.

**Design:** The original Cultural Atlas identity, usable responsive web interface, accessible activity controls and print/export show a cohesive working product, not only an API proof.

**Potential impact:** The target is a specific activity-planning workflow for senior-living recreation teams and families. The user study is operational and voluntary, but **zero** human outcomes have been verified. Do not assert a measured improvement.

**Quality of idea:** Qloo's cultural taste graph is used to suggest explainable adjacent cultural directions rather than generic age-based activity lists or ungrounded model guesses. The facilitator retains final choice.

Historical synthetic blinded comparison: **anchor-only preferred in 4/5 evaluator cases, one tie**. The result is disclosed, not presented as a modern live benchmark or a human trial. Later product repairs have not yet been independently evaluated with humans.

## What does not block submission

The event's official required checklist does **not** demand a demonstration video or a minimum number of real-user pilot participants. A still-open zero-response human study is an honest limitation, **not an official eligibility failure**. Other concerns such as Qloo upstream rate limiting or temporary service availability warrant monitoring, not fabricated results.

## Independent verification commands

From a fresh clone with Node.js 22 and npm:

```bash
npm ci
npm run submission:assets:check
npm run submission:preflight:offline
npm run verify:offline
```

CI verifies screenshot SHA-256 manifests, first-party brand artwork, source parity, unit tests, preview smoke, Qloo safety properties, and submission evidence integrity. The publicly accessible live app must still be rechecked before final Devpost save.

## Human authorization boundary

This package updates repository content only. It **does not** log into Devpost, click Submit, send messages, recruit participants, or assert an authenticated account status. These actions require the entrant's explicit control and real participant consent.
