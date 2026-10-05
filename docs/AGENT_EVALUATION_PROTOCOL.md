# Pre-registered synthetic agent evaluation protocol

Status: registered before any new evaluator agent received the task.

## Evidence class

Every result produced under this protocol is **synthetic agent evaluation—not real-user evidence**. Reports live only under `docs/agent-evaluation/` and are mechanically isolated from the real `/study` collection and aggregation path.

## Target-role proxy panel

Five isolated evaluators receive one documented role lens each:

1. activity or life-enrichment director;
2. activity assistant;
3. family caregiver;
4. recreation or engagement specialist;
5. assisted-living activities staff member.

They receive the same task and rubric, cannot see other reports, and must inspect the actual live product or report the tooling failure. They assess task completion, relevance, novelty, usefulness, trust, clarity, facilitator control, signal legibility, template feel, accessibility and severe concerns. Each reports Technology, Design, Proxy Impact and Idea on a 0–100 scale.

Persona labels are evaluation lenses, not claims that an agent holds that occupation.

## Blinded A/B proxy panel

Five separate isolated evaluators receive complete Plan A and Plan B in alternating deterministic order. The labels do not reveal which plan is anchor-only or Qloo-expanded until after scoring. They score relevance, novelty, usefulness, specificity and coherence from 1–5, select a preference or tie, and explain the choice. Every eligible result is retained.

Assignments:

| Evaluator | First presentation |
|---|---|
| AB-01 | Plan A |
| AB-02 | Plan B |
| AB-03 | Plan A |
| AB-04 | Plan B |
| AB-05 | Plan A |

## Specialist panels

Separate isolated reviews cover keyboard/screen reader, mobile/zoom, cognitive clarity, privacy/safety, adversarial technical security and Qloo sponsor integrity. Severe means a defect that breaks task completion, accessibility, evidence truth, privacy, security, live reliability or sponsor credibility.

## Aggregation

Aggregation is deterministic. It reads only versioned files under `docs/agent-evaluation/results/`. Missing or malformed reports fail closed. It reports counts, arithmetic means and exact preference numerators/denominators without significance or human-impact claims.

## Exclusions

A report is excluded only for missing required fields, inability to inspect the supplied artifact, or explicit protocol breach. Exclusions and failures remain listed. Dissenting or unfavorable results are never removed.
