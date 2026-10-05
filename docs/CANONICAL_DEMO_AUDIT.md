# Intermediate canonical judge example audit (historical)

Status: **Superseded by the consolidated ten-case whole-output audit in
[`DEMO_CASE_AUDIT.md`](./DEMO_CASE_AUDIT.md) and
[`DEMO_CASE_AUDIT.json`](./DEMO_CASE_AUDIT.json).** This record is retained so
judges can see the earlier candidates and decisions rather than a cleaned-up
history. The current canonical example is **Ella Fitzgerald + Roman Holiday**
at **95.0/100**.

Phase 4 evaluated complete live Qloo outputs rather than cherry-picking individual signals. Every candidate was run against the public Resonance production path with a calm, 30-minute, small-group request. Candidates were scored for exact resolution, intuitive cross-category relationships, visual clarity, activity usefulness, semantic coherence, and meaningful surprise.

| Rank | Anchors | Score | Decision | Full-result concern |
|---|---|---:|---|---|
| 1 | Ella Fitzgerald + Roman Holiday | 96 | **Canonical judge example** | No severe issue. Selected signals are Jazz, Reporter, Inventive, swing; retained evidence also includes piano, Vocal-Jazz, oldies, Easy Listening. |
| 2 | Louis Armstrong + Casablanca | 86 | Strong alternate | Expatriate enters the selected set as the closing signal. |
| 3 | Ella Fitzgerald + Casablanca | 78 | Reject | Expatriate ranks #2 and drives the Casablanca bridge. |
| 4 | Judy Garland + Singin' in the Rain | 67 | Reject | Christian and Tragic dominate the selected set. |
| 5 | Louis Armstrong + Singin' in the Rain | 61 | Reject | Christian and Robin Hood enter the selected set. |
| 6 | Frank Sinatra + Casablanca | 49 | Reject | Five Star, Record Label, Discover, LGBTQ+ friendly dominate the selected set. |
| 7 | Nat King Cole + Singin' in the Rain | 35 | Reject | MasterCard enters the selected set. |
| 8 | The Beatles + The Wizard of Oz | 32 | Reject | American Express and Self-Improvement Seekers enter the selected set. |
| 9 | Louis Armstrong + New Orleans | 82 | Strong alternate | Prohibition is coherent historically but less immediately judge-friendly than the winning case. |

## Why the winner is defensible

The canonical example is not a hand-edited output. Its complete returned evidence remains visible in the audit trail. The selected live signals are:

1. Jazz — a direct but still useful cultural extension of Ella Fitzgerald.
2. Reporter — a cross-domain bridge that is legible because *Roman Holiday* centers on reporter Joe Bradley.
3. Inventive — a broader creative-participation cue.
4. swing — a recognizable adjacent musical cue.

Additional retained evidence remains visible: piano, Vocal-Jazz, oldies, Easy Listening.

This example demonstrates the intended value proposition without hiding awkward Qloo evidence from other tested cases: literal favorites become adjacent cross-category signals that can change the session structure and prompts.

## Integrity rule

Do not filter or suppress individual Qloo signals merely to improve screenshots. If the live Qloo result for the canonical inputs materially changes in the future, rerun this bounded audit before updating judge-facing evidence.
