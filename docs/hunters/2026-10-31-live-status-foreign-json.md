# Hunter Network 2.0: live-status route fallback (2026-10-31)

## Repo ownership and prior checkpoint
- Target: `P00NSMASHER/resonance-qloo`, isolated branch `hunters/live-status-foreign-json-fallback-20261031`; at selection time it had **zero open PRs**. PR #25 already merged on main and remains authoritative for structured production receipt validation. This work deliberately avoids `check-build-receipt.mjs` and production deployment/source.
- Hunter A read current Portfolio Brain PRs #809, #810, #812, #813 and trading-platform PR #523: dedicated owners govern them. No observation baseline, order path, automation schedule, or release was changed.
- Hunter B inspected `P00NSMASHER/abvmschoolstarworld`: draft PR #451 owns Calendar civil-date checks and draft PR #453 owns preview-server containment. Both remain untouched. Next ABVM work should be complementary to those branches.

## Reproducible root cause
`scripts/check-live-qloo.mjs` tries `/api/status` first, then `/_api/status` **only when HTTP/JSON parsing fails**. A successful 200 JSON response from an unrelated frontend router (e.g. `{"service":"frontend-router"}`) prematurely wins even when `/_api/status` contains the verified Resonance status. The script then exits 1, generating a false negative. This is a synthetic repro of a possible routing behavior, **not** evidence of an actual live outage.

## Behavior change (narrow)
Only an object with `service: "resonance"` can win endpoint selection. Unrelated, null, or array JSON permits trying the alternate Floot path. Once a genuine Resonance status is returned, all original contract, Qloo origin, live/ready, and connected/configured checks still run. A stale true Resonance contract or degraded status **does not** trigger alternate-route laundering.

## Adversarial tests
Extended `scripts/test-live-qloo-check.mjs` with a synthetic HTTP server:
1. Unrelated JSON at `/api/status`, valid Floot envelope at `/_api/status` must succeed via the latter.
2. Unrelated JSON at primary, **degraded** secondary must exit 3 (never green).
3. A genuine, **stale** Resonance primary must fail even when secondary falsely claims ready.

Retain existing positive, preview, rate-limited, degraded, refresh and malformed-contract tests. Run `npm run qloo:live:selftest`; exact-head GitHub CI, security and deployment parity checks remain release gates. No runtime dependencies, customer data or production state changes.

## Public candidates evaluated (source-pinned, no imports)
- [ajv-validator/ajv](https://github.com/ajv-validator/ajv), MIT license confirmed via repo LICENSE, default master inspected SHA `f177fe323420ccb23e1a79445fd470cbf80aee7c` (2026-04-24), unarchived; adding schema compiler and transitive packages is excessive for checking one identity field.
- [colinhacks/zod](https://github.com/colinhacks/zod), MIT license confirmed via repo LICENSE, default main inspected SHA `2554b70c3d4a80273381e61d527d820720626440` (2026-10-30), unarchived; app does not require a new schema dependency to reject unrelated JSON.
- **Selected:** small original predicate in Node's existing HTTP harness; no external implementation copied, no new license/NOTICE or lockfile changes, and no added transitive security exposure. Repo activity and license were checked; no unsupported CVE-free guarantee is made.

## Baseline, effort, rollback, next
- Baseline: original code returned first parsed JSON, regardless of service marker. Expected outcome under synthetic foreign-primary/ready-secondary: exit 1.
- Proposed outcome: fallback route is tried only for non-Resonance JSON; three adversarial checks guard fail-closed semantics. Record exact-head CI result separately after it finishes.
- Estimated time saved: **0.5–1.5 engineer-hours (low confidence)** *if* this routing symptom occurs, based on avoided manual API-path diagnosis and repro setup. Measured production saving: **not yet observed**.
- Rollback: revert this PR. No migration, storage or deployment changes.
- Next: independent status-route smoke against an authorized test deployment; follow ABVM's non-overlapping PWA/offline regression backlog only after current owner PRs settle.
