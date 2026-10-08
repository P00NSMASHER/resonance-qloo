# Resonance first-pilot facilitator kit

**Status:** Ready for voluntary outreach by the project owner. No invitations have been sent by automation, and no human results have been collected or verified by this kit.

Study link: **https://resonance-qloo.floot.app/study**

## Eligible participants and boundaries

Invite 3–5 willing **adults** who actually work in activity/life-enrichment or recreation/engagement roles, assisted-living activities, or adjacent family caregiving. Do not ask for, record, or input any resident names, health history, contact information, patient/client details or protected records. No paid endorsement, manufactured testimonial or pressure to respond favorably. The task is a cultural engagement workflow, not a clinical intervention.

The study is a short, nonrandomized **pilot**. It cannot demonstrate causal or clinical benefit; negative results matter as much as positive ones.

## Voluntary invitation: ready to copy, not sent

> I'm testing Resonance, a prototype that uses familiar music and film preferences to suggest activities for older adults and their families. I'm looking for a few people who have experience planning activities or supporting family engagement. The anonymous exercise takes about 8–12 minutes, compares planning with and without the app, and asks for honest feedback, whether positive or negative. Participation is entirely optional. No resident names or health information are needed.
>
> Study: https://resonance-qloo.floot.app/study
>
> At the end, please download the anonymous JSON receipt and give it to me directly so your response can be included. A submitted form alone does not count as a completed study response.

Share this personally only with willing, appropriate contacts. **Do not automate recruitment** or scrape participant lists.

## Facilitation protocol, same for every volunteer

1. Confirm the volunteer is an adult in an eligible role and understands the voluntary anonymous pilot. Do **not** write down their name or resident/client information in the dataset.
2. Use one device and a stable network; do not coach toward positive ratings. Use the same fixed scenario for everyone: 30-minute calm small group, favorites Ella Fitzgerald and Roman Holiday.
3. For the baseline task, the participant creates a complete usable four-part plan *without* Resonance or any other AI tool. Start and stop the timer only on a completed plan.
4. For the second task, open the live Resonance app, confirm its Qloo status is verified, build a plan from the same two favorites, and finish only when a usable/adaptable plan is ready. Do not use the **illustrative preview** mode. Return to the study tab to stop the stopwatch.
5. Record honest 1–5 ratings, yes/no future-use response and brief improvement note. Avoid personal information. Accept all unfavorable ratings without intervention.
6. Consent deliberately, submit the form, **download the receipt** and privately hand that JSON file to the facilitator. A valid backend response is not, by itself, a verified participant.
7. The facilitator reviews the receipt, confirms eligibility, consent, receipt handoff, non-fixture origin and real live-tool use. Duplicates, missing files and inconsistent details must be reconciled before analysis.
8. Keep receipt files and the review manifest in a **private** `private-study/` folder outside shared/public folders. Never commit participant files or comments to GitHub.

The study may reject too-short or overlong timers. Do not override recorded times, hand-edit the receipt or replace the participant's negative answer.

## Anonymous facilitator review manifest (private only)

Create a separate JSON file, for example `private-study/reviewed.json`. It must contain *no participant names, contact data or comments*. Use this shape; the IDs shown below are intentionally invalid placeholders and cannot pass validation without real downloaded receipts.

```json
{
  "manifestVersion": "2026-10-08-v1",
  "source": "anonymous-receipts",
  "studyVersion": "2026-10-07-v2",
  "reviewedOn": "YYYY-MM-DD",
  "facilitatorAttestation": "I personally checked that each listed receipt came from a consenting eligible adult who tested live Resonance; no synthetic, demo, or test fixture is included.",
  "participants": [
    {
      "responseId": "PASTE_REAL_RECEIPT_ID_HERE",
      "consentReviewed": true,
      "eligibleAdultVerified": true,
      "receiptReceived": true,
      "liveResonanceVerified": true,
      "notFixtureVerified": true
    }
  ]
}
```

Add one record per **personally verified real** participant and enter the actual review date. Do not affirm a criterion until you checked it. A manifest is a human attestation **not cryptographic proof of authenticity**. It prevents accidental inclusion of fixtures or unreviewed submissions, but cannot independently prove that a person exists.

## Analysis, after 3–5 real completed receipts

For the normal anonymous study, place one raw downloaded receipt JSON object per line in `private-study/receipts.jsonl`, keeping the original files privately for reconciliation.

```bash
npm ci
npm run study:evidence:selftest
npm run study:analyze -- private-study/receipts.jsonl private-study/reviewed.json
```

This returns **no metrics** and exits with status 2 if a review file is absent, fewer than three complete reviewed responses exist, the participant list does not match, there are duplicate IDs, or any invalid/unreviewed rows remain. With exactly 3–5 reconciled responses, it reports descriptive aggregates but **does not print private participant comments, individual response IDs, or identifiable small-sample role breakdowns**.

The legacy impact-study CSV is a separate reporting path. If used, its private review file must set `"source": "impact-csv"` and match CSV `participant_id` values. Run `npm run impact:study -- private-study/impact.csv private-study/impact-reviewed.json`. Keep the two sources separate; do not combine their outcomes.

Even after successful analysis, report the role context, convenience-sample size and lack of causal inference. Publishing comments or quotes requires a **separate, explicit, documented consent review**. An approved aggregate is not a license to publish the raw receipts.

## Stop conditions and limitations

Stop the attempt if consent is declined, the respondent is ineligible, only illustrative Qloo data are available, the browser cannot run the study reliably, or identifying/sensitive content has been entered. Preserve an unfavorable valid result; never substitute it with a better score.

Existing independent synthetic evaluations, including the unfavorable Qloo-versus-anchor-only comparison, remain unchanged. **Real validated human sample count is still zero** until actual privately verified volunteer receipts are collected and reconciled.
