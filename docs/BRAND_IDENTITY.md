# Resonance | Cultural Atlas visual identity

**Positioning:** Cultural intelligence for human connection. **Brand line:** Culture becomes connection.

This brand refresh upgrades the user experience and visuals without altering the Qloo API, personal-data boundaries, evidence disclosures or human review contracts.

## Creative direction

Resonance is a culturally fluent, human-first product. The visual world connects four editorial objects: music, film, literature and place. Three sweeping teal bands suggest cultural intersections and a bridge between familiar favorites and surprising adjacent interests. The signature wave emblem is a deliberately simple connection mark, not a claim about brainwave analysis or health outcomes.

### Core colors

| Token | Value | Purpose |
| --- | --- | --- |
| Midnight Ink | `#14243B` | Primary text, elevated CTA, dark panels |
| Peacock Teal | `#137C78` | Brand emphasis, active action, focus |
| Warm Ivory | `#FAF7F1` | Foundation and negative space |
| Soft Coral | `#EDAA88` | Restrained editorial accent |
| Cultural Mist | `#E7F2EF` | Supporting evidence backgrounds |

Typography: editorial serif (Georgia / Iowan Old Style fallbacks) for headline storytelling, Inter and system sans-serif for application content. Both decorative and functional parts have fallback fonts.

## Source assets

- Hosted editorial artwork: `/_cdn/static/559ce4f0-ef12-4f04-ace1-f855c328ffa1.png` (1024 × 576).
  - **Permanent repository copy:** `public/brand/resonance-cultural-atlas.png`.
  - The portable Vite application now loads the repository asset at `/brand/resonance-cultural-atlas.png`, while the live Floot app uses its own original CDN path. Subject: vinyl, film, literature, travel map linked through peacock-teal ribbons. The hero includes written alt text.
- Hosted standalone wave emblem: `/_cdn/static/10b9d53a-6d7b-43b2-85c4-27117e62d390.png` (1024 × 1024).
  - **Permanent repository copy:** `public/brand/resonance-connection-emblem.png`.
  - Editable vector interpretation: `docs/brand/resonance-symbol.svg` (also available at `public/brand/resonance-symbol.svg`). Floot project icon and small header emblem. Decorative instances have empty alt attributes because an adjacent brand wordmark labels the link.
- Canva editable identity board: https://www.canva.com/d/qpfmNH8wxTS5pH_
- Canva view: https://www.canva.com/d/z4tEgoDKRFSNkQI

These are commissioned/generated brand illustrations, **not** photographs of real participants, recommendation evidence, or screenshots of Qloo results. The public application serves the assets from Floot's CDN; a portable clone using the canonical React app references the same public CDN URLs. Future stand-alone rehosting should copy these assets to first-party storage.

## UI implementation

The homepage starts with a new accessible logo lockup, explicit headline, short product explanation, one primary anchor link to the real session builder, and a supporting original visual. The redesigned hero becomes a single-column layout on mobile. The rest of the application keeps its working controls, provenance, transparent human-approval steps, accessible opt-outs, and printable evidence.

Brand CSS includes focus-visible treatment, reduced-motion support, and a print rule that removes decorative media. Inline semantic text does not depend on the availability of the images. Asset references are intentionally public and contain no secrets.

## Verification and honest boundaries

- Floot runtime is source-captured in `floot-production/` and checked through the content-addressed manifest and CI parity checks.
- Floot's own tests and TypeScript checks must pass. Public status and recommendation endpoints must still operate after publish.
- Browser visual review is required for exact layout acceptance at narrow mobile, tablet and desktop sizes. Server and TypeScript tests do **not** verify pixel rendering.
- Human-outcome impact is unverified. Brand visuals must not be confused with clinical efficacy, survey results, or representative resident photos.

**Acceptance rubric:** legible wordmark/icon; working CTA; no horizontal overflow; strong text contrast; no content obstruction by decorative media; traceable real Qloo flow; and a visually calm, consistent interface at 390px, 768px, 1440px.
