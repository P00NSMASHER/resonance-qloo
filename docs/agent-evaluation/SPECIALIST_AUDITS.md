# Specialist agent audits

All scores below are synthetic agent evaluations—not real-user evidence.

| Independent lens | Initial score | Severe findings | Repair disposition |
|---|---:|---|---|
| Keyboard and screen reader | 84 | Unnamed favorite inputs; missing dynamic announcements and result labeling | Added labels, live regions, alert semantics, named result/review sections, and retained native keyboard controls |
| Mobile, zoom, and print | 88 | Portable copy omitted practical fields; print retained interactive clutter | Copy now includes final actions, materials, participation and decisions; print hides interactive controls; mobile controls are at least 44px |
| Cognitive clarity | 82 | Copy ignored edits/decisions; stale evidence could be mistaken for validation; approval wording overstated | Copy derives reviewed actions; facilitator-authored changes are explicitly not Qloo-validated; completion wording says decisions are complete rather than claiming approval |
| Privacy and safety | 79 | Raw network address in limiter; open feedback logged; missing activity safety preflight | Network keys are SHA-256 digests with eviction; feedback is withheld from logs; safety preflight is visible and exported |
| Adversarial technical/security | 72 | Unbounded upstream use/caches/status probes; stale snapshot; receipt gap | Added per-client/global limits, bounded caches, cached status, strict receipt syntax, republished and refreshed exact snapshot. Public build receipt is completed separately |
| Qloo sponsor integrity | 82 | Qloo proxy plan lost 0/5; stale snapshot/evidence wording | Unfavorable result retained and disclosed; no superiority claim; snapshot republished; “winning run” wording removed |

The remaining Qloo-plan quality and zero-real-participant limitations are not converted into passes by agent testing.

