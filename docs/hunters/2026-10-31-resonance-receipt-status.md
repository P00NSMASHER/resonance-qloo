# Source Hunter checkpoint: structured production receipt status (2026-10-31)

## Authority and conflict check
- Repository: `P00NSMASHER/resonance-qloo`, main baseline `5be81f32270f60bb06d87e0d43b90bb9b85782c9`. At review: no open PRs/issues. Resonance is outside the other specialized Hunter ownership tracks. No deployments or Floot source snapshots changed.
- Hunter A inspected `P00NSMASHER/portfolio-brain` and `P00NSMASHER/trading-platform`: Portfolio Brain observation/acceptance PRs #812/#813 remain controlled by its dedicated reliability owner; research PR #523 remains controlled by the Tradier research owner. No baseline/clock or trading changes.
- Hunter B selected this isolated, backwards-compatible source-verification defect rather than modifying ABVM draft PR #453 (preview QA server) or #451 (calendar dates).

## Reproduced baseline defect
`scripts/check-build-receipt.mjs` used `body.includes(receipt.deploymentContractVersion) && body.includes('ready')`. Offline adversarial examples with `qlooStatus: 'not-ready'` or `qlooStatus: 'degraded'`, `mode:'preview'`, and a message mentioning `ready` all passed the old substring gate. This is a **checker false-positive risk**, not evidence that the current Floot deployment was bad or any customer was affected.

## Candidate source evaluation
- [ajv-validator/ajv](https://github.com/ajv-validator/ajv), MIT ([exact LICENSE](https://github.com/ajv-validator/ajv/blob/master/LICENSE)): schema validation is mature but adding runtime/dependency/lockfile surface for seven exact fields was unnecessary. **Rejected direct dependency**.
- [nodejs/undici](https://github.com/nodejs/undici), MIT ([exact LICENSE](https://github.com/nodejs/undici/blob/main/LICENSE)): production-grade HTTP client; Node 22 already supplies built-in `fetch`. **Rejected direct dependency**.
- **Chosen:** new independent, 16-line strict-field validator with Node built-ins; no copied code, no transitive packages, no license notices needed. The checked source licenses are compatible, but neither project is imported. No unverified security/maintainer score claimed.

## Implementation and verification
- Checker now requires valid JSON, exact `service`, `contractVersion`, `qlooApiOrigin`, `mode:live`, `qlooStatus:ready`, and explicit connected/configured booleans. Accepts existing Floot `{json:{...}}` wrapper.
- Five synthetic offline `node:test` cases cover positive, Floot wrapping, stale/degraded spoofed substring, wrong origin, contradictory flags, and malformed payloads.
- Local Node self-test: **5/5 passing**, script syntax passed. GitHub exact-head full CI is an independent release gate; do not equate local tests with CI or a real deployment test.
- No changes to `BUILD_RECEIPT.json`, `floot-production`, assets, server runtime, API keys, paid services or publication workflow.
- Estimated saved debugging time: **0.5–2 engineer-hours** (low-confidence counterfactual: diagnosing a spoofed/incorrect green readback manually versus isolated tests); observed runtime/test time saving **not measured**.

## Rollback and next
Revert this PR to restore the old receipt check; no migrations or stored data to undo. After exact-head CI, owner can consider permitted merge; no direct production deployment. Future priority: verify the Floot live status endpoint independently and test disconnected/ready transitions without altering production.
