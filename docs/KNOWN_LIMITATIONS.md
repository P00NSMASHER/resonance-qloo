# Known limitations

## Credential-dependent live verification

The event-issued Qloo credential has been requested and is still pending. Until it is connected:

- the hosted live-Qloo action remains disabled;
- no illustrative value is presented as a real Qloo result;
- the exact production tool chain cannot be claimed as end-to-end verified;
- the redacted request-to-result evidence remains intentionally incomplete.

After a credential is configured, Resonance still does **not** immediately call the integration “live.” A lightweight Qloo probe must succeed first. A bad/expired credential therefore appears as a degraded state rather than a false green status.

## Qloo rank vs numeric score

Qloo taste-analysis responses can contain ordered tags without a numeric affinity value on each tag. Resonance does not convert rank into a fake percentage.

- If Qloo returns enough numeric scores, the agent may use their mean normalized score as one evidence signal.
- If Qloo returns ordered-but-unscored tags, the agent records `ranked-order`, displays **Rank #N**, and uses that ordering.
- A missing Qloo score is represented as `null`.

This makes the UI slightly less flashy but prevents false precision.

## Optional explainability compatibility

Resonance requests Qloo's optional `feature.explainability=true` capability first. If Qloo responds with HTTP 400 or 422 **and the returned error detail specifically implicates explainability**, the client retries that same bounded taste-analysis request once without the optional flag. It does not retry unrelated validation failures, so a bad entity signal or another request error is not silently converted into a successful fallback.

## Credential verification is cached

Successful live-connectivity verification is cached briefly to avoid spending event quota on every page load. An ordinary status read can therefore remain `ready` briefly after a credential/upstream failure; the next actual Qloo call still fails closed and the browser downgrades its local connection state.

When the UI is `degraded` or `rate-limited`, it exposes **Retry Qloo verification**. Preview/no-credential mode intentionally does not show this control. That explicit retry asks the server to invalidate **any** cached probe state—including a formerly healthy `ready` result—and perform a fresh Qloo probe. Forced re-verification is bounded to two attempts per client per minute and twenty per server process per minute, so the retry path cannot become an unbounded Qloo-quota drain.

## Cultural affinity is not identity

A Qloo affinity is a cultural signal, not proof of a person's identity, medical condition, preferences in every context, or future behavior. Resonance treats Qloo as a source of candidate connections for a human facilitator to review.

## Human facilitation remains required

The generated session is a starting point. Staff or family should adapt, reject, or reorder suggestions based on the person's actual response.

## Not medical advice

Resonance is not a clinical, diagnostic, dietary, medication, or medical decision-support tool. It intentionally avoids making health claims.

## Sparse or ambiguous input

Two vague anchors may resolve ambiguously. Resonance classifies each resolved entity as either an exact normalized-name match or a **Qloo top-result match to review**. Top-result matches are visibly labeled, counted in the decision evidence, and preserved in copied session evidence rather than being presented as equally certain.

This is a review aid, not a confidence score. When a non-exact Qloo top-result match is present, Resonance now pauses **before taste analysis**, returns the resolved candidates for review, and requires the user to explicitly confirm those exact Qloo entity IDs before the plan can continue. Editing the anchors or category hints clears the pending confirmation.

Resonance fails closed if fewer than two anchors resolve or if Qloo returns fewer than three usable affinity signals. Exactly three usable signals are accepted: the four-step plan reuses the third real selected signal for the closing step, and the UI/export disclose that reuse instead of inventing a synthetic fourth signal.

## Event quotas and upstream availability

Live Qloo behavior is subject to the event-issued credential, quota, rate limits, and upstream availability. Requests are bounded, rate-limited, cached where safe, and time out rather than retrying indefinitely. The per-client and aggregate application limiters are in-memory and therefore scoped to one running server process; they are not presented as a distributed quota authority across multiple horizontally scaled instances. The upstream Qloo quota remains the ultimate cross-instance limit.

## Hosted environment

The current public demo is externally hosted on Floot. The public repository is the reproducible source of truth for code, tests, architecture, and the event-tooling proof path. Source changes do not by themselves prove the public deployment is current; finalization therefore includes a public bundle parity check and requires re-publishing Floot when the hosted feature set is stale.

**Current observed blocker (October 2, 2026):** the advisory deployment checker reaches the public Floot URL, but `/api/status` returns `text/html` instead of the current Resonance JSON status contract. That proves the published Floot build is stale or missing the current API backend even though the website itself is reachable. Judge-readiness remains blocked until Floot is republished and `npm run deployment:check` passes against the public URL.
