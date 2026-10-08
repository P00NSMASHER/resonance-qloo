# Devpost update packet: Resonance

**Prepared:** October 8, 2026. **Status:** Ready for the existing entry; **not published or saved on Devpost in this run**. Only the entrant's authenticated Devpost account can confirm or apply changes.

**Existing project, do not duplicate:** https://devpost.com/software/resonance-nud9ek  
**Contest:** https://qloo.devpost.com/  
**Entry editor:** Open `https://qloo.devpost.com/` while signed in → **My projects** → **Resonance** → **Edit project**, per [Devpost help](https://help.devpost.com/article/123-how-to-edit-a-submission).

## Project fields

**Title:** Resonance

**Tagline:** Culture becomes connection. Qloo-powered discovery, human-led engagement.

**Short description:**
A Qloo-powered cultural intelligence agent that turns familiar songs, films, books, brands and places into accessible, explainable engagement sessions. Built for activity and recreation staff and families, with live cultural signals and human control.

**Live demo:** https://resonance-qloo.floot.app

**Public code:** https://github.com/P00NSMASHER/resonance-qloo

**Development started:** September 30, 2026.

**Built with / technologies:** Qloo API, React, TypeScript, Floot, Node.js, Vitest, GitHub Actions.

## Updated Devpost project story (paste into Story)

### Culture becomes connection.

An activity director might know that someone loves Ella Fitzgerald and *Roman Holiday*, yet still have to invent a practical 30-minute group session from those two fragments. A generic generator can repeat the familiar titles. Resonance uses **Qloo's actual cultural taste graph** to discover adjacent music and film genres, then turns those signals into a plan a real person can judge, adapt and run.

Resonance is a cultural-engagement planning tool, **not** a clinical intervention or medical advice. It requires no resident name, patient record, diagnosis or identity profile.

### Five things Resonance really does

1. **Find the cultural anchors.** Enter two to four artists, movies, books, places or other cultural favorites. Resonance resolves them through Qloo's live search API. Non-exact matches stop for explicit user review; a short-lived signed receipt prevents silent approval of a different entity.
2. **Discover the adjacent tastes.** Qloo Insights supplies the live evidence. The agent requests music and media genre families, preserves returned tags and independent ranked ordering, deduplicates them and never invents percentages or a cross-category confidence average.
3. **Build an actionable session.** Choose calm, social or lively energy, a one-to-one, small-group or community setting, and 30, 45 or 60 minutes. Resonance creates four timed activities with concrete stimuli and discussion questions. Each step includes ways to answer verbally, nonverbally, or pass.
4. **Explain the Qloo difference.** An honest, same-input comparison shows what an anchor-only plan can say versus what Qloo actually discovered. Every activity links to its selected cultural signal, with provenance, Qloo entity IDs and the Resolve → Evaluate → Compose → Explain trace available in an audit panel.
5. **Put people in control.** A facilitator can **Keep, Modify or Replace** every suggestion, then copy or print the reviewed plan. Staff-authored changes are not relabeled as Qloo results.

The public app runs at **https://resonance-qloo.floot.app**. The live button is only available after verified Qloo readiness. An offline illustrative preview is separately labeled as a demonstration, never as live Qloo evidence.

### Why Qloo matters

Without Qloo, the deterministic baseline has only the names the visitor typed. With Qloo, Resonance resolves those names to real Qloo entities, retrieves category-specific adjacent cultural signals, and visibly uses them in the activity plan. The Qloo contribution is inspectable, rather than a decorative API call.

The agent deliberately does not claim hidden language-model reasoning. Its composition and safeguards are engineered and testable: typed workflow stages, a time-limited signed entity-review gate, bounded retries and caching, request-bound provenance checks, real returned tags, and rejection of insufficient or mismatched evidence.

### Design and engineering

The live Resonance interface uses an original wave-connection emblem and editorial Cultural Atlas artwork, in midnight ink, peacock teal and warm ivory. It works on desktop and iPhone-size screens and provides keyboard focus states, accessible alternatives and printable plans.

The public MIT-licensed GitHub repository contains source code, original image and SVG assets, instructions, automated tests, and **seven permanent screenshots captured from the actual running application**.

### What was difficult, and what we learned

Early unfiltered Qloo signals included generic ratings and price descriptors that produced awkward activities. We improved signal relevance with Qloo's music/media genre filters and made each recommendation more concrete while retaining the returned evidence.

We also published an **unfavorable historical synthetic evaluation**: five blinded proxy evaluators preferred the anchor-only plan in **4/5** cases, with one tie and zero Qloo-plan wins. That is not a human trial, and it remains available in the repository. Newer software improvements have **not yet** been shown to outperform the anchor-only plan with real participants.

The lesson: cultural novelty is not the same thing as practical usefulness. Transparency and the ability for a human to reject a suggestion are essential.

### Potential impact, without exaggerated claims

Resonance targets a genuine planning task for recreation and life-enrichment staff and families. Its voluntary anonymous evaluation flow is operational, but **zero real-user responses have been validated**. We make no demonstrated time-savings, usefulness-rating, clinical-efficacy or human-superiority claims. A supervised pilot with consenting eligible adults is planned, and negative results will count.

### Try it in 60 seconds

Open **https://resonance-qloo.floot.app** and confirm the header says **Live Qloo verified**.

Use the default Ella Fitzgerald (Artist) and *Roman Holiday* (Film), calm energy, small group, 30 minutes. Select **Build with live Qloo**. Follow **Your favorites → What Qloo discovered → Your session**, then compare the anchor-only baseline with the Qloo-grounded result. Choose **Keep**, **Modify** or **Replace** on the activities. Open the audit trail for entity IDs, actual selected genre signals, evidence provenance and the four-stage agent trace.

For the optional review-gate demonstration, try an ambiguous cultural phrase and see that a non-exact entity match needs explicit confirmation before Qloo taste analysis. Results from the third-party Qloo service can change; no particular search result is guaranteed.

**Repository:** https://github.com/P00NSMASHER/resonance-qloo  
**Real published-product screenshots:** https://github.com/P00NSMASHER/resonance-qloo/tree/main/docs/judge-gallery  
**Live anonymous pilot:** https://resonance-qloo.floot.app/study

## Updated image selection

Devpost's gallery may require images to be uploaded from the device rather than linked. These seven ordinary GitHub PNG links are durable and may be opened or saved for uploading:

| Order | Image | Permanent raw image URL | Caption |
| --- | --- | --- | --- |
| 1 | Desktop hero | https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/00-brand-desktop.png | Resonance Cultural Atlas brand and entry point |
| 2 | Live Qloo comparison | https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/02-qloo-transformation.png | Actual Qloo-grounded discovery vs same-input baseline |
| 3 | Completed plan | https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/03-finished-session.png | Four activities reviewed with Keep / Modify / Replace |
| 4 | iPhone homepage | https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/00-brand-iphone.png | Mobile interface at 390px width |
| 5 | Input workspace | https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/01-input.png | Default favorites, session preferences and live state |
| 6 | Study desktop | https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/04-study-desktop.png | Voluntary study interface, not participant outcomes |
| 7 | Study phone | https://raw.githubusercontent.com/P00NSMASHER/resonance-qloo/main/docs/judge-gallery/04-study-iphone.png | Anonymous study on iPhone-sized screen |

Prefer images 1–3 above the fold. These are verified browser renders, not generated mockups. Never replace the original Devpost project or remove collaborators.

## Final account-side check

1. Log in to the existing Devpost account. Confirm the hackathon **Qloo Agentic Hackathon**, project name **Resonance**, and **Submitted** status before editing.
2. Use the hackathon **My projects / Edit project** flow to update the *submission* itself, not only the portfolio version. Devpost notes these may diverge after the deadline.
3. Update the tagline, short description, Story and current screenshots. Keep any verified start date, repository URL, existing project identity, team, and required declarations unchanged unless they are factually wrong.
4. Save, confirm **Submitted** rather than **Draft**, open the public project, and verify the live links and current story. No live-edit success claim should be made until those two surfaces have been checked.
5. Finish before **October 30, 2026, 11:45 PM EDT**. The event rules do not require a demo video. Preserve working public demo and repository access during judging.

**Authenticated status:** Not verified by this packet. No Devpost changes or screenshot uploads were performed automatically.
