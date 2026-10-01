# Finalization runbook

Use this only after the event-issued Qloo API credential arrives.

## 1. Connect the credential

Add the credential to the hosted app as `QLOO_API_KEY`.

Do not paste it into:
- chat,
- GitHub,
- Devpost,
- screenshots,
- logs,
- issue comments.

## 2. Verify the public app flips to live mode

Open:

https://resonance-qloo.floot.app

Confirm the header says **Live Qloo connected**.

If it still says access pending, stop and fix hosting configuration before doing anything else.

## 3. Run the official-tooling proof

On a machine with Node.js 22.19+:

```bash
npm install --global @qloo/qloo-harness
qloo setup --qloo
npm install
npm run qloo:proof -- "classic jazz vocals"
```

Save the redacted output. Never save the API key itself.

## 4. Exercise the actual product path

Use the public app with:

- Ella Fitzgerald
- Singin' in the Rain
- Italian food

Confirm:
- at least two anchors resolve;
- Qloo taste evidence is returned;
- the agent decision trace is visible;
- the evidence basis says either `normalized-score` or `ranked-order`;
- `explainabilityResultCount` accurately reflects whether Qloo returned per-result `query.explainability` metadata;
- `aggregateExplainabilityAvailable` is true only when the live payload actually includes non-empty aggregate Qloo explainability;
- no numeric percentage is displayed unless Qloo actually supplied a numeric score;
- all four activity steps render;
- each activity has a why-it-fits explanation.

## 5. Capture live evidence

Against a local production-style server:

```bash
npm run build
QLOO_API_KEY=... npm start
npm run evidence:capture
```

Or against the public deployment:

```bash
RESONANCE_BASE_URL=https://resonance-qloo.floot.app npm run evidence:capture
```

The capture script refuses to run unless the server reports that Qloo is connected.

## 6. Update submission evidence

Replace the credential-pending section in:

`docs/SUBMISSION_EVIDENCE.md`

with the verified, redacted:
- Qloo workflow/tool;
- request inputs;
- resolved entity IDs;
- taste evidence used;
- evidence basis;
- agent trace;
- session result.

## 7. Run the full preflight

```bash
npm run typecheck
npm test
npm run build
npm run smoke:preview
npm run submission:preflight
```

All must pass.

## 8. Final Devpost checks

Required by the current Qloo submission form:

- project start date: September 30, 2026;
- public demo: https://resonance-qloo.floot.app
- public repo: https://github.com/P00NSMASHER/resonance-qloo
- text description present;
- external hosting live;
- MIT license visible/detected.

Demo video is not required.

## 9. Submit only after end-to-end proof

Do not mark the hackathon submission complete until the public app itself works end-to-end with real Qloo data.
