# Canonical demo-case audit

Resonance did **not** choose a judge example by hiding awkward Qloo signals.

Nine culturally coherent anchor pairs were run against the live public app. Every candidate below completed with HTTP 200 and exact-name resolution. The complete returned affinity list for every case is retained in [DEMO_CASE_AUDIT.json](./DEMO_CASE_AUDIT.json).

## Scoring method

Each full result was scored from 0–5 on:

- exact entity resolution;
- intuitive cross-category relationship;
- visual clarity for a first-time judge;
- activity usefulness;
- low semantic weirdness;
- meaningful surprise.

Overall score is the unweighted mean × 20. No individual returned signal was removed before scoring.

| Rank | Candidate | Overall | Selected Qloo signals | Main issue |
|---|---|---:|---|---|
| 1 | **Aretha Franklin + The Sound of Music** | **91.7** | Entertainment · soul · funk · rhythm & blues | “Entertainment” is broad, but the complete eight-signal set is coherent |
| 2 | Aretha Franklin + The Blues Brothers | 85.0 | Games · soul · Blues · funk | “Games” is distracting as the top signal |
| 3 | The Supremes + Roman Holiday | 78.3 | Record Label · Reporter · 60s · soul | first two signals are less immediately persuasive |
| 4 | Ella Fitzgerald + Singin' in the Rain | 71.7 | Christian · Jazz · Inventive · swing | “Christian” distracts from otherwise coherent music evidence |
| 5 | Louis Armstrong + New Orleans | 61.7 | Four Star · Moderately expensive · Cultural Arts · Prohibition | pricing/rating tags dominate |
| 6 | Johnny Cash + Butch Cassidy and the Sundance Kid | 50.0 | Triumphant · Classics · VISA · Record Label | VISA materially weakens judge confidence |
| 7 | The Beatles + Mary Poppins | 45.0 | Entertainment · LGBTQ+ friendly · Three Star · American Express | payment/rating tags dominate |
| 8 | Frank Sinatra + Casablanca | 45.0 | Five Star · Record Label · Discover · LGBTQ+ friendly | selected set is not a convincing cultural bridge |
| 9 | Elvis Presley + Jailhouse Rock | 33.3 | Salmon Blt · Food & Beverage · Tourist attraction · Four Star | semantically distracting whole output |

## Canonical judge example

**Aretha Franklin + The Sound of Music** is the canonical demo case.

Why:

- both anchors resolve exactly;
- all eight returned signals are retained and inspectable;
- the full returned set forms the strongest coherent cluster of the nine evaluated cases;
- the selected signals are understandable without hiding any Qloo result;
- the case still shows genuine cross-category expansion rather than merely repeating the literal inputs.

A complete redaction-safe live response is committed at [CANONICAL_DEMO_EVIDENCE.json](./CANONICAL_DEMO_EVIDENCE.json).

The older live evidence artifacts remain in the repository unchanged for historical transparency.
