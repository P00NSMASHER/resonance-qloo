# Security

## Secrets

The Qloo API credential is server-side only and must be supplied through `QLOO_API_KEY`. Never place the credential in browser code, screenshots, issues, commits, or demo recordings.

Submission proof tooling treats the credential as a value-level secret, not only a suspicious field name: nested proof output replaces any literal key value with `[REDACTED]`, and the final serialized artifact is rejected if the original `QLOO_API_KEY` is still present. CI runs an adversarial redaction self-test for this behavior.

The official `qloo mcp` proof subprocess also receives a minimal environment allowlist rather than the full parent `process.env`. It gets the event Qloo key plus basic OS/config-location variables needed to launch the CLI; unrelated application, GitHub, cloud, database, and API secrets are intentionally excluded.

The server also constrains `QLOO_API_BASE_URL` to the documented Qloo API hosts (`hackathon.api.qloo.com` and `api.qloo.com`) before any request can carry the key. Trusted Qloo hosts must use the standard HTTPS port, credential-bearing fetches refuse redirects, and loopback HTTPS is accepted only when the explicit local smoke-test flag is enabled **and** `NODE_ENV` is exactly `development` or `test`. An unset, staging-like, or production environment therefore cannot activate the loopback escape hatch. That test flag is intentionally absent from the deployment environment example.

## Data minimization

Resonance accepts cultural entities and preference examples only. Do not send a resident/client name, email, account ID, device identifier, health information, location history, or other personal data to Qloo. A cultural entity can itself contain a public person's name (for example, a favorite artist); that is different from identifying the person using the product.

## Resolution review receipts

Non-exact Qloo entity confirmation uses an ephemeral capability receipt rather than trusting entity IDs alone. The server derives a domain-separated HMAC signing key from the server-side Qloo credential and signs a receipt over the canonical submitted anchors/category hints, energy, setting, duration, reviewed Qloo entity IDs, and an expiry timestamp. Receipts expire after five minutes. The derived signer is consistent across ordinary replicas/server restarts that share the same Qloo credential, while a changed request, changed reviewed ID set, expiry, or Qloo credential rotation invalidates the receipt and forces review again.

The receipt is not a Qloo credential, but it is still treated as transient capability data: it stays in browser state only long enough to complete the reviewed follow-up, is cleared when session-defining inputs change, and is never included in copied sessions or captured submission evidence. The domain-separated derivation never exposes or returns the Qloo credential itself.

## Network-rate-limit identity

The public server derives a transient rate-limit bucket key from the proxy-nearest/right-most forwarded network address, falling back to the socket address when forwarding is absent. The raw address is immediately SHA-256 hashed and truncated before it enters limiter state. That identifier is used only to bound public requests; it is not included in Qloo requests, recommendation output, proof artifacts, or application logs.

## Reporting

If you find a security issue, do not open a public issue containing exploit details or credentials. Contact the repository owner privately through their GitHub profile.

## Scope

Resonance is a cultural-engagement prototype, not a medical or diagnostic system.
