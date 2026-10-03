# Target-user validation study

Status: **Recruiting real participants**

Public study page: https://resonance-qloo.floot.app/study

Study version: `2026-10-03-v1`

Canonical demo evidence: `docs/CANONICAL_DEMO_EVIDENCE.json`

## Purpose

Test whether Resonance materially improves a real activity-planning workflow for people who plausibly perform or support that work.

This study is product validation, not clinical research. It does not ask about residents/clients, health conditions, or patient outcomes.

## Eligible perspectives

The study accepts these role categories:

- activity / life-enrichment director;
- activity assistant;
- family caregiver;
- recreation / engagement staff;
- assisted-living staff;
- other closely adjacent role.

## Controlled task

Every participant receives the same prompt:

> Create a usable 30-minute calm small-group engagement session when the only known cultural favorites are Aretha Franklin and The Sound of Music.

### Baseline

The participant creates a usable four-part plan using their normal approach, without Resonance or another AI tool.

The study page times this step.

### Resonance

The participant repeats the exact same planning task using the public Resonance app, which opens with the same favorites and session context.

The study page times the task until the participant says they have a plan they could use or adapt.

## Measures

The anonymous response contract stores only:

- role category;
- baseline planning time in seconds;
- Resonance planning time in seconds;
- perceived relevance, 1–5;
- perceived novelty, 1–5;
- confidence / usefulness, 1–5;
- whether the participant would use something like Resonance in real planning;
- one short answer to: “What would make this genuinely useful to you?”;
- anonymous response ID, study version, consent, and submission timestamp.

## Privacy and integrity rules

The page instructs participants not to enter names, email addresses, phone numbers, resident/client details, health information, or other personal data.

The response schema:

- rejects unknown fields;
- rejects likely email addresses or phone numbers in open feedback;
- bounds all timing/rating values;
- requires explicit aggregate-use consent;
- does not include a name/email field.

The study page is `noindex,nofollow`.

No direct participant quote will be published because this study version does not request separate quotation permission. Open-text feedback may be summarized or paraphrased only.

## Completion rule

Phase 5 is complete only when at least **3 valid real target-user responses** exist.

No synthetic, test, developer-generated, or inferred response counts as user evidence.

Duplicate response IDs are counted once.

## Aggregate analysis

When the threshold is met, publish:

- valid sample size and role mix;
- median baseline planning time;
- median Resonance planning time;
- median absolute time saved;
- median percentage time reduction;
- mean relevance rating;
- mean novelty rating;
- mean usefulness rating;
- count / percentage answering yes to real-world reuse;
- anonymized thematic summary of the improvement feedback.

The raw study records remain out of the public repository. Only aggregate, non-identifying results are published.

Analyze a private local export with:

```bash
npm run study:analyze -- /path/to/private-study-export.jsonl
```

The analyzer re-validates each row, deduplicates response IDs, reports invalid rows, and computes the completion threshold plus all promised aggregate metrics. Raw feedback is emitted only for private manual thematic review and must not be committed.

## Recruitment

On October 3, 2026, ten one-time noncommercial research invitations were sent directly to publicly listed activity/life-enrichment professionals at senior-living organizations. One direct address hard-bounced, leaving nine direct invitations with no hard bounce observed. Three additional one-time forwarding requests were sent to senior-engagement/activity-professional organizations; one hard-bounced, while two association requests had no hard bounce observed. No unsolicited follow-up will be sent.

The outreach:

- linked only to the anonymous study page;
- stated the study is not a sales pitch;
- requested no resident/client or health information;
- promised no unsolicited follow-up if the recipient did not respond.

Recipient email addresses are intentionally not committed to this public repository.


## Current evidence status

As of the latest production-log verification on October 3, 2026:

- valid real target-user responses: **0**;
- the completion threshold is **not met**;
- no impact metric, testimonial, time-savings claim, or user quote is being reported as evidence yet.

This section must be replaced with aggregate results only after at least three valid real responses exist.
