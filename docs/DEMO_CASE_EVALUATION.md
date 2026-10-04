# Canonical judge-demo case evaluation

Date: 2026-10-04

## Method

Eight bounded live-Qloo candidate pairs were run against the public Resonance production endpoint with the same context: calm, small-group, 30 minutes. Every candidate used exact-name Qloo entity resolution and returned `qloo-live` provenance. The complete returned affinity set was retained during evaluation; no individual signal was hidden or removed.

Candidates were assessed on six judge-facing dimensions from 1 (poor) to 5 (excellent):

1. intuitive cross-category relationship;
2. visual/readability clarity;
3. activity usefulness;
4. minimal semantic weirdness across the **complete** returned evidence;
5. meaningful surprise beyond the literal anchors;
6. exact entity resolution.

Scores are editorial evaluation of the live outputs, not Qloo confidence scores.

| Candidate | Selected signals | Notable additional returned evidence | Intuitive | Clear | Useful | Low weirdness | Surprise | Exact | Total / 30 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Louis Armstrong + Casablanca** | Cultural Arts; Joyous; Optimism; Expatriate | Robin Hood; Jazz; swing | 5 | 5 | 5 | 3 | 5 | 5 | **28** |
| Ella Fitzgerald + Casablanca | Jazz; Expatriate; Inventive; swing | piano; Nightclub; Vocal-Jazz; oldies | 5 | 5 | 4 | 3 | 5 | 5 | **27** |
| Louis Armstrong + The Wizard of Oz | Cultural Arts; Self-Improvement Seekers; Wizard; Joyous | Tornado; Optimism; Robin Hood; WITCH | 4 | 4 | 4 | 3 | 5 | 5 | **25** |
| Ella Fitzgerald + The Wizard of Oz | Self-Improvement Seekers; Classics; Jazz; Wizard | Tornado; WITCH; Inventive; swing | 4 | 4 | 4 | 3 | 5 | 5 | **25** |
| Judy Garland + Singin' in the Rain | Christian; Tragic; Timeless; Optimistic | swing; Broadway; oldies; Adaptation | 4 | 4 | 4 | 3 | 4 | 5 | **24** |
| Louis Armstrong + Singin' in the Rain | Christian; Cultural Arts; Optimism; Robin Hood | Jazz; swing; Optimistic | 4 | 4 | 4 | 2 | 4 | 5 | **23** |
| Frank Sinatra + Casablanca | Five Star; Record Label; Discover; LGBTQ+ friendly | History museum; Very expensive; Robin Hood; Luxurious | 3 | 3 | 3 | 2 | 5 | 5 | **21** |
| Nat King Cole + Singin' in the Rain | Creole; Sprawling; Record Label; MasterCard | Expensive; Christian; Timeless; Florida | 3 | 3 | 2 | 1 | 5 | 5 | **19** |

## Canonical example

**Louis Armstrong + Casablanca** is the canonical judge example.

Why:

- both anchors resolve exactly;
- the complete evidence contains a strong, understandable cultural cluster: Cultural Arts, Joyous, Optimism, Jazz, and swing;
- the result demonstrates meaningful cross-category expansion beyond the literal inputs;
- the session actions remain easy to explain in under a minute;
- the full evidence is still shown, including the less-intuitive `Expatriate` and `Robin Hood` signals.

The canonical example is a presentation choice, **not** a ranking filter. Resonance does not suppress, reorder, or cherry-pick Qloo evidence for this example.

## Transparency rule

Existing exact-match and review-gated live evidence artifacts remain unchanged. This evaluation does not replace them. It only chooses the clearest default input pair for judges.
