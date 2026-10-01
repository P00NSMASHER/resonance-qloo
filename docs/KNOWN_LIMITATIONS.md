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

## Credential verification is cached

Successful live-connectivity verification is cached briefly to avoid spending event quota on every page load. That means a credential revoked moments after a successful probe can remain shown as ready until the cache expires; the next actual Qloo call still fails closed.

## Cultural affinity is not identity

A Qloo affinity is a cultural signal, not proof of a person's identity, medical condition, preferences in every context, or future behavior. Resonance treats Qloo as a source of candidate connections for a human facilitator to review.

## Human facilitation remains required

The generated session is a starting point. Staff or family should adapt, reject, or reorder suggestions based on the person's actual response.

## Not medical advice

Resonance is not a clinical, diagnostic, dietary, medication, or medical decision-support tool. It intentionally avoids making health claims.

## Sparse or ambiguous input

Two vague anchors may resolve ambiguously. The product fails closed when too little evidence is available rather than pretending confidence. A future refinement may add explicit user confirmation of ambiguous entity matches.

## Event quotas and upstream availability

Live Qloo behavior is subject to the event-issued credential, quota, rate limits, and upstream availability. Requests are bounded, rate-limited, cached where safe, and time out rather than retrying indefinitely.

## Hosted environment

The current public demo is externally hosted on Floot. The public repository is the reproducible source of truth for code, tests, architecture, and the event-tooling proof path.
