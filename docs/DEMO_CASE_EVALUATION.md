# Canonical judge-demo case evaluation

Phase 4 tested a bounded set of real public Qloo runs. We retained the **entire returned signal set** for each completed case and did not hide awkward signals. The goal was not to find the highest score numerically; it was to find a complete, truthful example that communicates Qloo's value to a judge without extra explanation.

## Rubric

Each completed case was scored 1–5 on six dimensions:

1. intuitive relationship of the returned evidence to the supplied favorites;
2. visual clarity of the selected top-four signals;
3. usefulness of the resulting four activities;
4. minimal semantic weirdness;
5. meaningful surprise beyond simply restating the favorites;
6. exact entity resolution.

Maximum: 30.

## Results

| Candidate | Intuitive | Clarity | Activity usefulness | Low weirdness | Surprise | Resolution | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Ella Fitzgerald + Duke Ellington** | 5 | 5 | 5 | 5 | 3 | 5 | **28/30** |
| Benny Goodman + Glenn Miller | 5 | 4 | 4 | 4 | 3 | 5 | 25/30 |
| Ella Fitzgerald + Louis Armstrong | 4 | 4 | 4 | 4 | 4 | 5 | 25/30 |
| Ella Fitzgerald + Billie Holiday | 4 | 3 | 4 | 3 | 4 | 5 | 23/30 |
| Louis Armstrong + Duke Ellington | 3 | 3 | 3 | 2 | 4 | 5 | 20/30 |
| Doris Day + The Sound of Music | 3 | 2 | 2 | 2 | 4 | 5 | 18/30 |
| Louis Armstrong + Some Like It Hot | 3 | 2 | 3 | 2 | 4 | 5 | 19/30 |
| Sinatra + Casablanca | 2 | 2 | 2 | 1 | 4 | 5 | 16/30 |
| Frank Sinatra + Dean Martin | 2 | 1 | 2 | 1 | 4 | 5 | 15/30 |
| Nat King Cole + Ella Fitzgerald | 2 | 1 | 2 | 1 | 4 | 5 | 15/30 |
| Johnny Cash + Dolly Parton | 2 | 1 | 2 | 1 | 4 | 5 | 15/30 |
| Elvis Presley + Las Vegas | 2 | 1 | 2 | 1 | 4 | 5 | 15/30 |
| The Beatles + London | 2 | 1 | 2 | 1 | 4 | 5 | 15/30 |

Two additional attempts were rate-limited before a complete result and were not scored.

## Selected canonical example

**Ella Fitzgerald + Duke Ellington**

The full live result is committed in `LIVE_QLOO_CANONICAL_DEMO.json`.

Why it won:

- both anchors resolve exactly;
- all four selected Qloo signals are immediately legible: **Jazz, swing, piano, Vocal-Jazz**;
- the four supporting signals remain visible rather than being hidden;
- the plan can use each selected signal without a semantic detour;
- Qloo adds structured adjacent evidence beyond merely replaying the two artist names;
- the result is strong enough to understand without a verbal defense.

The previous evidence artifacts remain in the repository for transparency. This canonical example is a presentation choice, not a replacement for the full audit record.
