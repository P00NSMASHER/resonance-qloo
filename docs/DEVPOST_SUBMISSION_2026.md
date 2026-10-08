# Resonance: final Qloo Agentic Hackathon submission copy

> **Status:** Copy-ready proposed update, **not yet applied** to the authenticated Devpost entry. The public project already exists, but this document does **not** claim its live content has been edited. The user or an explicitly authorized authenticated browser session must apply the update.
>
> **Official contest:** [Qloo Agentic Hackathon](https://qloo.devpost.com/), deadline **October 30, 2026, 11:45 PM EDT**. The official rules require a working externally hosted app, a public code repository with source/assets/instructions and discoverable open-source license, and a description. **No demo video required.**
>
> **Public entry:** https://devpost.com/software/resonance-nud9ek  
> **Live demo:** https://resonance-qloo.floot.app  
> **GitHub repository:** https://github.com/P00NSMASHER/resonance-qloo  
> **Current judge screenshots:** [Current published-product gallery](judge-gallery/README.md) (with captured PNGs and a SHA-256 manifest)

## Name

**Resonance**

## Short tagline

**Culture becomes connection. Qloo-powered discovery, human-led engagement.**

## Short description

Resonance uses live Qloo cultural intelligence to transform a few familiar artists, movies, books, brands, or places into a practical, explainable engagement session. It helps recreation and life-enrichment staff and families explore connections between familiar favorites, prepare accessible activities, and choose what to keep, modify, or replace.

## Story (paste-ready Devpost narrative)

### The problem

Sometimes an activity director or family caregiver knows only a few things someone enjoys: an Ella Fitzgerald recording, a favorite film, a treasured place. Turning those fragments into a fresh, respectful 30-minute group session takes research, context, and planning. A generic planner can repeat the familiar favorites, but it cannot look up Qloo's actual cross-category cultural relationships.

**Resonance turns cultural discovery into a facilitator-ready starting point.** It is a cultural engagement tool, not a medical, diagnostic, dietary, or therapy system. It does not ask for a person's name or medical history.

### What Resonance does

Enter two to four cultural anchors, optionally label their categories, and choose energy, setting, and duration (30, 45, or 60 minutes). Resonance then:

1. **Resolves** favorites through the live Qloo entity search API. Exact normalized-name matches are accepted; ambiguous top results pause for explicit review protected by a time-limited, request-bound signed receipt.
2. **Discovers** genuinely returned music and media genre signals using Qloo Insights. It preserves real Qloo evidence, deduplicates and interleaves separately ranked categories, and does **not** invent global confidence percentages.
3. **Composes** four timed cultural-engagement activities with concrete facilitator cues: what to show or play, one approachable question, accessible verbal/nonverbal participation options, and the ability to pass.
4. **Explains** the decisions. A same-input comparison shows an anchor-only baseline beside the Qloo-grounded result. A detailed audit trail preserves resolved Qloo IDs, selected and additional tags, provenance, explainability availability, and the agent's Resolve → Evaluate → Compose → Explain trace.
5. **Keeps a person in control.** The facilitator can keep, modify, or replace every activity, then copy or print the reviewed session. Edited activity text is not relabeled as Qloo evidence.

A verified live Qloo connection is required for live mode. The clearly labeled illustrative preview is never presented as real Qloo output.

### Why the Qloo integration is essential

Without Qloo, Resonance's comparison baseline can responsibly use only the names and category hints the user provided. The live agent instead resolves those inputs to Qloo entities and uses Qloo's returned cultural taste signals to suggest new directions. The additional connections, and their source evidence, are visible to the judge rather than buried behind a claim that an LLM somehow knows a person's tastes.

Qloo is not decoration; it supplies the retrieval and cultural evidence for the actual agent workflow. Session construction remains deterministic and inspectable rather than pretending to use an unverified language-model reasoning step.

### Technical implementation

- **Frontend:** React and TypeScript with a responsive, keyboard-accessible visual identity, mobile Safari considerations, and honest status/error states.
- **Application:** Floot-hosted public web app, with portable React source and reproducible GitHub build.
- **Qloo:** Event API origin `https://hackathon.api.qloo.com`; category-aware `/search` resolution and `/v2/insights` using real entity IDs and activity-relevant music/media genre tag filters.
- **Agent coordination:** Typed resolve/evaluate/compose/explain stages, bounded server requests, upstream timeout and rate-limit handling, credential-scoped caching, signed manual entity-review confirmation, request-bound result receipts, and inspectable provenance.
- **Evidence integrity:** No fabricated numeric affinity scores, source-linked facilitator rationale, safe failure for sparse evidence, and clear separation of Qloo signals from authored activity suggestions.
- **Validation:** Automated tests and independent live-browser checks cover source parity, Qloo contracts, signed review, responsive layout, facilitator decisions, and copy/print behavior.

### Design and interaction

Resonance's original Cultural Atlas visual identity uses midnight ink, peacock teal, warm ivory, a connection-wave emblem, and commissioned/generated editorial artwork showing music, film, books, and travel linked by cultural signals. The real published app has been tested at desktop and iPhone viewport sizes. The design supports the experience rather than replacing it with a mockup.

### Challenges, decisions, and what we learned

Qloo can return real cultural affinities that are not useful activity directions on their own. Early unfiltered results included generic star/price tags; the live agent now selects Qloo-derived music/media genre families and attaches specific optional facilitation cues. A historical synthetic blinded five-evaluator comparison preferred the **anchor-only plan in 4/5 cases**, with one tie and zero Qloo-plan wins. That unfavorable proxy result remains public and has **not** been rewritten or claimed to represent real users.

The lesson is that adding novel cultural signals is not the same as making a whole plan more useful. Making evidence legible and allowing the facilitator to accept, change, or reject the output is central to the product.

### Potential impact and present limitations

Resonance addresses a concrete planning workflow for senior-living recreation and life-enrichment staff and family caregivers. A functioning voluntary validation study and private receipt-review process exist, but there are **currently zero independently reviewed real-user responses**. We therefore make **no demonstrated time-savings, clinical-effectiveness, usefulness-score, or human-superiority claims**.

The next step is to collect honest, consented feedback from three to five eligible adults, retain negative outcomes, and treat any resulting figures as small-sample descriptive observations, not causal evidence.

## Judges: 60-second hands-on walkthrough

1. Open **https://resonance-qloo.floot.app** without a login; confirm the header says **Live Qloo verified**.
2. Use the default **Ella Fitzgerald** (Artist) and **Roman Holiday** (Film), calm energy, small group, 30 minutes.
3. Click **Build with live Qloo** and wait for the real response. Never use *Preview with example data* as evidence of Qloo integration.
4. Follow **Your favorites → What Qloo discovered → Your session**. Inspect how each of the four activity cards references a real selected Qloo signal and supplies a facilitator question.
5. Compare **Without Qloo · anchor-only baseline** to **With Qloo · live taste graph** using the same input.
6. Try the **Keep / Modify / Replace** activity controls. For engineering detail, open **View evidence & audit trail** and inspect Qloo entity IDs, provenance, ranked tags, signed-review behavior, and the four-stage trace.

**Optional second scenario:** Enter an ambiguous phrase such as `Italian food`. If Qloo resolves it to a non-exact entity, the app correctly pauses before taste analysis and asks for explicit confirmation. Actual third-party search results can change; the specific match must not be guaranteed.

## Built with

`Qloo API`, `React`, `TypeScript`, `Floot`, `Node.js`, `Vitest`, `GitHub Actions`

## Image captions for durable judge-gallery screenshots

- **00-brand-desktop.png:** Actual desktop hero, original Resonance emblem and editorial Cultural Atlas artwork.
- **00-brand-iphone.png:** Actual responsive iPhone-sized hero.
- **01-input.png:** Public app with default cultural anchors and live Qloo status.
- **02-qloo-transformation.png:** Real same-input Qloo comparison and adjacent cultural signals, not illustrative mock data.
- **03-finished-session.png:** Four-step session with completed facilitator keep/modify/replace review.
- **04-study-desktop.png / 04-study-iphone.png:** Real voluntary study workflow; these show the interface, not participant outcomes.

## Before submitting / updating Devpost

- Confirm that the authenticated Devpost entry is actually in **Submitted** state and lists this current live demo and repo. A public page alone cannot establish the authenticated submission status.
- Paste the updated text, use the seven permanent public GitHub screenshots (not the older ones or short-lived Actions artifact links), and confirm the MIT license is recognized under the GitHub repository's About/License area.
- If adding any study results before October 30, first run the private facilitator review workflow. Do not claim results based on synthetic tests.
- Check the live app and public links before the October 30, 11:45 PM EDT deadline, and keep submitted resources accessible through the November 2–16 judging period.
