# Canonical demo-case audit

Resonance did **not** choose a judge example by hiding awkward Qloo signals.

Ten culturally coherent anchor pairs were run against the live public app. Every candidate below completed with HTTP 200 and exact-name resolution. The complete returned affinity list and scoring dimensions for every case are retained in [DEMO_CASE_AUDIT.json](./DEMO_CASE_AUDIT.json).

## Scoring method

Each full result was scored from 0–5 on:

- exact entity resolution;
- intuitive cross-category relationship;
- visual clarity for a first-time judge;
- activity usefulness;
- low semantic weirdness;
- meaningful surprise.

Overall score is the unweighted mean × 20. No individual returned signal was removed before scoring.

| Rank | Candidate | Overall | Selected Qloo signals | Whole-output assessment |
|---|---|---:|---|---|
| 1 | **Ella Fitzgerald + Roman Holiday** | **95.0** | Jazz · Reporter · Inventive · swing | Best complete output. All eight returned signals are legible; Jazz/swing are coherent with Ella Fitzgerald, Reporter is directly legible from Roman Holiday's storyline, and no payment/rating/category artifact distracts the judge. |
| 2 | Aretha Franklin + The Sound of Music | 91.7 | Entertainment · soul · funk · rhythm & blues | Best complete output. Exact resolution and the entire returned set is musically coherent; only 'Entertainment' is broad rather than odd. |
| 3 | Aretha Franklin + The Blues Brothers | 85.0 | Games · soul · Blues · funk | Three selected signals are excellent; 'Games' as the top selected signal prevents it from beating the winner. |
| 4 | The Supremes + Roman Holiday | 78.3 | Record Label · Reporter · 60s · soul | A credible cross-category bridge, but Record Label and Reporter are less immediately persuasive than the stronger music tags. |
| 5 | Ella Fitzgerald + Singin' in the Rain | 71.7 | Christian · Jazz · Inventive · swing | Strong music coherence after the first tag, but 'Christian' is distracting as the top selected signal. |
| 6 | Louis Armstrong + New Orleans | 61.7 | Four Star · Moderately expensive · Cultural Arts · Prohibition | Cultural Arts and Prohibition are interesting, but pricing/rating tags dominate the first half. |
| 7 | Johnny Cash + Butch Cassidy and the Sundance Kid | 50.0 | Triumphant · Classics · VISA · Record Label | VISA and Record Label materially weaken judge confidence despite exact resolution. |
| 8 | The Beatles + Mary Poppins | 45.0 | Entertainment · LGBTQ+ friendly · Three Star · American Express | Payment and star-rating tags dominate the selected set. |
| 9 | Frank Sinatra + Casablanca | 45.0 | Five Star · Record Label · Discover · LGBTQ+ friendly | Selected tags are not a persuasive cultural bridge for judges. |
| 10 | Elvis Presley + Jailhouse Rock | 33.3 | Salmon Blt · Food & Beverage · Tourist attraction · Four Star | Full output is semantically distracting and unsuitable as a canonical demo. |

## Canonical judge example

**Ella Fitzgerald + Roman Holiday** is the canonical demo case.

Why:

- both anchors resolve exactly;
- all eight returned signals remain visible and understandable: Jazz, Reporter, Inventive, swing, piano, Vocal-Jazz, oldies, Easy Listening;
- the selected four are coherent without hiding any Qloo result;
- **Reporter** is legible from the film's storyline while **Jazz** and **swing** connect naturally to Ella Fitzgerald;
- **Inventive** adds a useful adjacent creative prompt rather than merely repeating an input;
- the case demonstrates genuine cross-domain expansion with less semantic noise than the other nine candidates.

A complete redaction-safe live response is committed at [CANONICAL_DEMO_EVIDENCE.json](./CANONICAL_DEMO_EVIDENCE.json).

The older live evidence artifacts remain in the repository unchanged for historical transparency.
