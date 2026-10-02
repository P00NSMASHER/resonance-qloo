# Security

## Secrets

The Qloo API credential is server-side only and must be supplied through `QLOO_API_KEY`. Never place the credential in browser code, screenshots, issues, commits, or demo recordings.

Submission proof tooling treats the credential as a value-level secret, not only a suspicious field name: nested proof output replaces any literal key value with `[REDACTED]`, and the final serialized artifact is rejected if the original `QLOO_API_KEY` is still present. CI runs an adversarial redaction self-test for this behavior.

## Data minimization

Resonance accepts cultural entities and preference examples only. Do not send a resident/client name, email, account ID, device identifier, health information, location history, or other personal data to Qloo. A cultural entity can itself contain a public person's name (for example, a favorite artist); that is different from identifying the person using the product.

## Reporting

If you find a security issue, do not open a public issue containing exploit details or credentials. Contact the repository owner privately through their GitHub profile.

## Scope

Resonance is a cultural-engagement prototype, not a medical or diagnostic system.
