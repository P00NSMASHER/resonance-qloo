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

## Timing integrity and participant instructions (October 8 update)

The study version remains `2026-10-07-v2` and its anonymous response schema remains unchanged. The UI now takes unaltered whole elapsed seconds from the timer, rather than silently rounding short attempts up to the minimum or clamping long attempts to the maximum. An attempt under 15 seconds in the baseline or 5 seconds in Resonance must continue before it can be recorded; a baseline over 60 minutes or Resonance trial over 30 minutes must be restarted. This rejection prevents a forbidden duration from becoming seemingly valid research data.

A participant should start the baseline clock only when genuinely ready to create a four-part plan. The second trial opens the live Resonance product in a new tab, then the participant returns to the original study tab to stop the clock after reviewing and adapting the plan. If the browser blocks the tab, that attempt must not start. The study provides a direct link and a visible recovery instruction. Device and tab switching delays may still affect measured time, so all timing differences are descriptive and *not* estimates of clinical outcomes or causal efficacy.

The participant's thank-you receipt is not a central anonymous survey database. The participant must download the JSON receipt and deliberately hand it to the facilitator. A server-side accepted metric record alone is not sufficient to count as a complete and eligible response. The service logs no free-text comment, while the downloaded receipt does contain the comment and should be handled privately.

**Participant review checklist:** be in an eligible adult role, use the same fixed scenario for both trials, create a genuinely usable baseline before ending that timer, use real Qloo (not the illustrative demo), complete all ratings honestly including unfavorable ratings, avoid personal/client details in the comment, explicitly consent, and deliver the anonymous receipt.

**Study limitations:** The single fixed scenario and non-randomized ordering can bias results. With only 3–5 willing volunteers, any comparisons are exploratory descriptions rather than controlled evidence of superiority. No unsolicited invitations or automated recruitment have been initiated.

## Privacy / integrity

The study requests only a role category, elapsed times, ratings, reuse intent, a short comment, and explicit consent. It instructs participants not to provide names, contact information, resident/client information, or health information. The schema rejects likely email addresses and phone numbers. Timing/rating metrics are logged without a raw network address; the open comment is withheld from server logs and returned to the participant in a downloadable anonymous JSON receipt.

For a response to count, the participant gives that receipt directly to the study facilitator. The facilitator stores it privately, reviews eligibility and content, and passes the receipt file to `npm run study:analyze -- <receipt-or-jsonl-file>`. A successful web request without delivery and review of the receipt is not counted as evidence.

The participant-facing page is `noindex,nofollow`. Responses are rate-limited. No participant response is considered evidence until it is reviewed as a real eligible response.

## Publication threshold

Do not publish aggregate impact claims with fewer than **3 complete real eligible participants**.

The deterministic aggregation script must remain fail-closed below that threshold. With 3–5 valid responses, report only observed aggregates and explicitly permitted role-only quotes.

## Recruitment

No automated or unsolicited recruitment is authorized by this protocol. The study link can be shared directly with willing eligible participants. Because the privacy-preserving open comment is participant-controlled, sessions should be supervised or followed by a deliberate receipt handoff. Any external outreach should be deliberate and user-approved.

This file is the source of truth for Phase 5 status. Until real responses exist, Phase 5 remains **data-collection ready but not evidence-complete**.
