# Finalization runbook

Use this only after the event-issued Qloo API credential arrives.

## 1. Connect the credential

Add the credential to the hosted app as `QLOO_API_KEY`.

For the Agentic Hackathon, also set:

```text
QLOO_API_BASE_URL=https://hackathon.api.qloo.com
```

Hackathon-issued keys are scoped to that event API origin. Resonance now defaults there, but the hosted environment should still make the intended origin explicit so deployment configuration is auditable.

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

Confirm the header says **Live Qloo connected**. If it reports degraded immediately after adding the key, verify the hosted environment is using `https://hackathon.api.qloo.com` before troubleshooting the credential itself.

Before continuing, also verify production UI parity with the repository:
- **Preview with example data** immediately renders an illustrative result;
- the example result visibly shows Artist / Film category hints where expected;
- the result metadata strip clearly separates source, evidence basis, the non-secret Qloo API origin, and generation time;
- the evidence panel shows the selected / returned signal count and the selection rule;
- selected Qloo evidence uses stable Plan signal #N numbering (up to four selected signals), while unselected results remain visible as Additional evidence;
- the plan cards repeat those signal numbers; when only three signals are selected, the closing step may truthfully reuse Signal #3 rather than inventing a fourth Qloo signal;
- Add/remove anchor controls respond on mobile;
- the public app does not show older labels or controls from a stale deployment.

If the status is still pending when a key is configured, or the public interactions do not match the current repository build, stop and fix/re-publish hosting before doing anything else.

## 3. Run the official-tooling proof

On a machine with Node.js 22.19+:

```bash
npm install --global @qloo/qloo-harness
qloo --version # must be 0.1.26 or newer
export QLOO_BASE_URL=https://hackathon.api.qloo.com
export QLOO_TRUSTED_BASE_URL=https://hackathon.api.qloo.com
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
- `returnedAffinityCount` matches the retained taste evidence and `selectedAffinityCount` matches the numbered plan signals;
- all four activity steps render;
- each activity references only a real selected signal; reuse is allowed, invented Qloo signals are not;
- each activity has a why-it-fits explanation;
- copied session text preserves the same selected/additional distinction and signal numbering shown in the UI.

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

The capture script refuses to run unless the server reports that Qloo is connected. It also requires the status endpoint and live recommendation provenance to agree on the Qloo API origin and, by default, requires `https://hackathon.api.qloo.com`. Override `QLOO_TRUSTED_BASE_URL` only if Qloo explicitly instructs you to use another gateway.

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
npm run deployment:check
```

All must pass. The deployment check validates both production layers: `/api/status` must expose the Resonance contract and trusted Qloo hackathon origin, and the public Floot HTML/JavaScript bundles must contain the current judge-facing evidence UI. A reachable but stale frontend or backend fails this step.

## 8. Final Devpost checks

Required by the current Qloo submission form:

- project start date: September 30, 2026;
- public demo: https://resonance-qloo.floot.app
- public repo: https://github.com/P00NSMASHER/resonance-qloo
- text description present;
- external hosting live;
- MIT license visible/detected.

As of October 2, 2026 at 8:25 AM Eastern Time, the authenticated Devpost project record reports Resonance submitted to the Qloo Agentic Hackathon (`submitted_at: 2026-10-02T08:25:09.325-04:00`). The submission window remains open until October 30, 2026 at 11:45 PM Eastern Time, so the submitted entry should continue to be updated as live proof improves. Re-check the live deadline before final lock in case the organizer changes it. Demo video is not required.

## 9. Treat the submitted Devpost entry as provisional until end-to-end proof

The submit action is complete, but judge-readiness is not. Keep updating the existing submission while the window is open. Do not treat Resonance as final until the public app works end-to-end with real Qloo data, live evidence capture succeeds, deployment parity passes, and the Devpost description/evidence reflect that verified live path.
