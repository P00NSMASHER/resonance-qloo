# Target-user validation study — open, no results claimed yet

Status: **Open / awaiting real participants**

Resonance has a public anonymous validation workflow at:

`https://resonance-qloo.floot.app/study`

The study is intended for 3–5 real adults in target or adjacent roles: activity/life-enrichment directors or assistants, recreation/engagement staff, assisted-living staff involved in activities, and family caregivers.

## Current evidence status

- valid real target-user responses counted in submission evidence: **0**
- no synthetic, developer-generated, inferred, proxy, or test response is counted as user evidence
- no testimonial, time-savings percentage, usefulness score, or user quote is claimed until real responses are retrieved and validated
- test fixtures exist only to prove the analysis code works and must never be mixed with participant data

## Controlled task

Every participant receives the same scenario:

> Create a usable 30-minute calm small-group engagement session when the only known cultural favorites are Ella Fitzgerald and Roman Holiday.

The study measures:

1. baseline planning time without Resonance or another AI tool;
2. planning/review time with the live Resonance app;
3. relevance (1–5);
4. novelty/useful new ideas (1–5);
5. confidence/usefulness as a starting point (1–5);
6. whether the participant would use something like Resonance in real planning;
7. one short improvement comment.

## Privacy / integrity

The study requests only a role category, elapsed times, ratings, reuse intent, a short comment, and explicit consent. It instructs participants not to provide names, contact information, resident/client information, or health information. The schema rejects likely email addresses and phone numbers.

The participant-facing page is `noindex,nofollow`. Responses are rate-limited. No participant response is considered evidence until it is reviewed as a real eligible response.

## Publication threshold

Do not publish aggregate impact claims with fewer than **3 complete real eligible participants**.

The deterministic aggregation script must remain fail-closed below that threshold. With 3–5 valid responses, report only observed aggregates and explicitly permitted role-only quotes.

## Recruitment

No automated or unsolicited recruitment is authorized by this protocol. The study link can be shared directly with willing eligible participants. Any external outreach should be deliberate and user-approved.

This file is the source of truth for Phase 5 status. Until real responses exist, Phase 5 remains **data-collection ready but not evidence-complete**.
