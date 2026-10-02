# Floot live-Qloo cutover

Use this when the event-issued Qloo credential is available. The public Resonance deployment is already parity-checked against GitHub; this checklist changes only the hosted live-Qloo configuration and verifies the result.

## Hosted settings

Configure the published Floot project with:

- `QLOO_API_KEY` — the event-issued credential. Keep it secret.
- `QLOO_API_BASE_URL=https://hackathon.api.qloo.com`

Do not paste the credential into chat, GitHub, Devpost, screenshots, logs, or documentation.

## Verification order

After the hosted environment has been updated and the backend is active:

```bash
npm run deployment:check
npm run qloo:live:check
```

Expected results:

1. `deployment:check` passes, proving the public frontend/backend still match the reviewed deployment contract.
2. `qloo:live:check` passes with:
   - `mode=live`
   - `qlooStatus=ready`
   - `qlooConfigured=true`
   - `qlooConnected=true`
   - `qlooApiOrigin=https://hackathon.api.qloo.com`

The Floot production status route is `/_api/status`; the repository checks both `/api/status` and `/_api/status` automatically and unwraps Floot's `{ json: ... }` response envelope.

## Stop conditions

Do not capture or publish live-Qloo evidence if any of these are true:

- status remains `preview`;
- `qlooConfigured=false`;
- `qlooConnected=false`;
- status is `degraded` or `rate-limited`;
- the public Qloo API origin differs from `https://hackathon.api.qloo.com`;
- deployment parity fails.

If status is degraded after the key is connected, use the app's **Retry Qloo verification** control and rerun `npm run qloo:live:check`.

## After readiness passes

Run the official proof and live evidence capture:

```bash
npm run qloo:proof -- "classic jazz vocals"
RESONANCE_BASE_URL=https://resonance-qloo.floot.app npm run evidence:capture
```

If evidence capture returns a Qloo entity-review requirement, review the displayed match in the app and rerun capture with the server-issued confirmation values. Never bypass that review gate.
