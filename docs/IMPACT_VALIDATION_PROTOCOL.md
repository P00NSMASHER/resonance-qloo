# Target-user impact validation protocol

## Purpose

Test whether Resonance materially improves planning speed and perceived usefulness for real target users. This is product validation, not clinical research. Do not involve residents/patients or collect health information.

## Eligible participants

Recruit 3–5 adults in roles such as:
- senior-living activity director or assistant;
- recreation / engagement staff;
- assisted-living staff involved in activities;
- family caregiver who plans engagement activities.

Record role only. Do not record names, employers, resident information, diagnoses, or other personal/health data.

## Standard task

Give every participant the same scenario:

> You know an older adult or small group likes **Ella Fitzgerald** and **Roman Holiday**. Create a 30-minute small-group engagement plan that uses those interests.

### Round A — without Resonance

1. Start a timer.
2. Participant creates the plan using their normal reasoning/workflow, but not Resonance.
3. Stop the timer when they say the plan is usable.
4. Record elapsed seconds.

### Round B — with Resonance

1. Open the public Resonance app.
2. Load the judge example (Ella Fitzgerald + Roman Holiday).
3. Start a fresh timer immediately before running the live plan.
4. Participant may read the result and decide when it is usable.
5. Stop the timer when they say they could use/adapt it.
6. Record elapsed seconds.

Counterbalance order across participants when practical (some B→A) to reduce learning-order bias.

## Post-task questions

Use 1–5 scales where 1 = very low / strongly disagree and 5 = very high / strongly agree.

1. Relevance of the Resonance plan: 1–5
2. Novelty/useful new ideas: 1–5
3. Confidence/usefulness as a starting point: 1–5
4. Would you use Resonance again for activity planning? yes/no
5. Open text: **What would make this genuinely useful to you?**
6. Optional role-only quote for public use. Ask explicit permission before marking it publishable.

## Data rules

Use `docs/impact-study-responses.csv`. Participant IDs should be anonymous labels such as P01. Quotes are private by default; set `quote_publishable=yes` only after explicit permission.

Never fabricate, infer, or backfill missing responses. Never convert a blank response into a positive response.

## Analysis

Run:

```bash
npm run impact:study
```

The script refuses to produce a publishable summary with fewer than 3 complete real participants. With 3–5 complete participants it reports:
- median planning time without Resonance;
- median planning time with Resonance;
- median time reduction;
- average relevance;
- average novelty;
- average usefulness/confidence;
- count who would use it again;
- publishable role-only quotes, if any.

Keep the raw CSV in the repository only if participants consent to publication of the non-sensitive responses. Otherwise run the analysis locally and commit only the aggregate summary.
