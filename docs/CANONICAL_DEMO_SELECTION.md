# Canonical judge demo selection

Phase 4 evaluated a bounded set of eight culturally coherent live Qloo input pairs. Every candidate was run against the public Resonance production endpoint with the same session context: **calm**, **small-group**, **30 minutes**.

The selection rule was fixed before choosing a winner. Each complete result was scored 1–5 on:

1. intuitive cross-category relationship;
2. visual/judge clarity;
3. activity usefulness;
4. minimal semantic weirdness;
5. meaningful surprise;
6. exact entity resolution.

No individual Qloo signal was removed or reordered for scoring. The complete returned top-eight evidence was retained below.

| Candidate | Selected four | Complete returned evidence | Score / 30 |
| --- | --- | --- | ---: |
| **Ella Fitzgerald + Roman Holiday** | Jazz; Reporter; Inventive; swing | Jazz; Reporter; Inventive; swing; piano; Vocal-Jazz; oldies; Easy Listening | **28** |
| Ella Fitzgerald + Casablanca | Jazz; Expatriate; Inventive; swing | Jazz; Expatriate; Inventive; swing; piano; Nightclub; Vocal-Jazz; oldies | 24 |
| Louis Armstrong + Casablanca | Cultural Arts; Joyous; Optimism; Expatriate | Cultural Arts; Joyous; Optimism; Expatriate; Robin Hood; Jazz; swing | 24 |
| Louis Armstrong + It's a Wonderful Life | Cultural Arts; Everyman; Regret; Joyous | Cultural Arts; Everyman; Regret; Joyous; Music; Optimism; Robin Hood; Angel | 24 |
| Judy Garland + Singin' in the Rain | Christian; Tragic; Timeless; Optimistic | Christian; Tragic; Timeless; Optimistic; swing; Broadway; oldies; Adaptation | 22 |
| Louis Armstrong + The Wizard of Oz | Cultural Arts; Self-Improvement Seekers; Wizard; Joyous | Cultural Arts; Self-Improvement Seekers; Wizard; Joyous; Tornado; Optimism; Robin Hood; WITCH | 22 |
| Nat King Cole + Singin' in the Rain | Creole; Sprawling; Record Label; MasterCard | Creole; Sprawling; Record Label; MasterCard; Expensive; Christian; Timeless; Florida | 17 |
| Frank Sinatra + Casablanca | Five Star; Record Label; Discover; LGBTQ+ friendly | Five Star; Record Label; Discover; LGBTQ+ friendly; History museum; Very expensive; Robin Hood; Luxurious | 17 |

## Why Ella Fitzgerald + Roman Holiday won

Both anchors resolved by exact normalized name. The full evidence set is legible without hiding awkward results:

- **Jazz** — immediately understandable from Ella Fitzgerald.
- **Reporter** — directly legible from the film's reporter storyline.
- **Inventive** — a useful adjacent creative prompt.
- **swing** — culturally coherent with the music anchor.
- **piano**, **Vocal-Jazz**, **oldies**, **Easy Listening** — all remain understandable supporting evidence.

The four selected signals create a visible cross-domain story rather than merely echoing the input names. The result is surprising enough to demonstrate Qloo's graph value but coherent enough that a judge does not need an explanation for why the evidence appeared.

## Canonical example contract

The canonical **Load judge example** is therefore:

- Ella Fitzgerald — artist
- Roman Holiday — movie
- calm
- small-group
- 30 minutes

This selection changes only the judge/example defaults. Historical live evidence artifacts remain immutable evidence of the runs they actually captured; they are not rewritten to match the newer canonical example.
