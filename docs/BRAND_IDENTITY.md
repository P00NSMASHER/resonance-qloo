# Resonance | Cultural Atlas visual identity

**Positioning:** Cultural intelligence for human connection. **Brand line:** Culture becomes connection.

This brand refresh upgrades the user experience and visuals without altering the Qloo API, personal-data boundaries, evidence disclosures or human review contracts.

## Creative direction

Resonance is a culturally fluent, human-first product. The visual world connects music, film, literature and place. The October 22, 2026 refresh expands that identity with six original photographic-style editorial images, warmer surfaces, colorful accents and more prominent headline typography. The imagery provides atmosphere and recognizable cultural starting points; it does not represent recommendation output.

Three sweeping teal bands in the original Cultural Atlas illustration suggest cultural intersections and a bridge between familiar favorites and surprising adjacent interests. The original illustration and wave emblem remain part of the asset collection. The signature wave is a connection mark, not a claim about brainwave analysis or health outcomes.

### Core colors

| Token | Value | Purpose |
| --- | --- | --- |
| Midnight Ink | `#14243B` | Primary text, elevated CTA, dark panels |
| Peacock Teal | `#137C78` | Brand emphasis, active action, focus |
| Warm Ivory | `#FAF7F1` | Foundation and negative space |
| Soft Coral | `#EDAA88` | Restrained editorial accent |
| Cultural Mist | `#E7F2EF` | Supporting evidence backgrounds |

Typography: editorial serif (Georgia / Iowan Old Style fallbacks) for headline storytelling, Inter and system sans-serif for application content. Both decorative and functional parts have fallback fonts.

## Original source assets retained

- Hosted editorial artwork: `/_cdn/static/559ce4f0-ef12-4f04-ace1-f855c328ffa1.png` (1024 × 576).
  - **Permanent repository copy:** `public/brand/resonance-cultural-atlas.png`.
  - The portable Vite application loads the repository asset at `/brand/resonance-cultural-atlas.png`, while the Floot app uses its own original CDN path. Subject: vinyl, film, literature and a travel map linked through peacock-teal ribbons.
- Hosted standalone wave emblem: `/_cdn/static/10b9d53a-6d7b-43b2-85c4-27117e62d390.png` (1024 × 1024).
  - **Permanent repository copy:** `public/brand/resonance-connection-emblem.png`.
  - Editable vector interpretation: `docs/brand/resonance-symbol.svg` (also available at `public/brand/resonance-symbol.svg`). Floot project icon and small header emblem. Decorative instances have empty alt attributes because an adjacent brand wordmark labels the link.
- Canva editable identity board: https://www.canva.com/d/qpfmNH8wxTS5pH_
- Canva view: https://www.canva.com/d/z4tEgoDKRFSNkQI

## October 22 photographic editorial collection

The six source PNGs are retained in `public/brand/` at their original resolution. Each has a matching first-party Floot asset. The portable application should use the corresponding `/brand/` path, so its visual assets remain available without depending on the hosted Floot app.

| Theme | Repository source | Resolution | Floot asset |
| --- | --- | --- | --- |
| Cultural collage | `public/brand/resonance-culture-collage.png` | 1672 × 941 | `/_cdn/static/a7409755-726c-4d0f-8cf8-a05b9198ef14-resonance-culture-collage.png` |
| Music | `public/brand/resonance-music.png` | 1672 × 941 | `/_cdn/static/1326b3a8-aed1-425b-b3e8-ba56ee3a5035-resonance-music.png` |
| Cinema | `public/brand/resonance-cinema.png` | 1672 × 941 | `/_cdn/static/6cc8e1cc-089e-4f6e-b6ca-ccc4f70c8d02-resonance-cinema.png` |
| Stories | `public/brand/resonance-stories.png` | 1672 × 940 | `/_cdn/static/8b603208-7ec9-4405-9ab6-0f2a226c6b44-resonance-stories.png` |
| Places | `public/brand/resonance-places.png` | 1672 × 941 | `/_cdn/static/6c910a5b-1c9b-4412-9c07-59ed4ccae456-resonance-places.png` |
| Connection | `public/brand/resonance-connection.png` | 1672 × 941 | `/_cdn/static/553246a1-bbf0-41ae-a71d-596b769b0481-resonance-connection.png` |

All six are **original AI-generated atmospheric artwork**, not documentary photographs of study participants or product users. Any depicted people are fictional. Neither these images nor the original brand illustrations establish testimonials, adoption, clinical effects, participant preferences, or Qloo recommendation evidence. Actual interface screenshots and their dated capture manifests remain separate under `docs/judge-gallery/`.

## UI implementation

The visual direction combines the existing accessible logo lockup, editorial headline, short product explanation, primary anchor link to the real session builder, and the expanded cultural image collection. The responsive layout must keep imagery and typography legible on mobile. The application retains its working controls, provenance, facilitator decisions, accessible participation alternatives, and printable evidence.

Brand CSS includes focus-visible treatment, reduced-motion support, and a print rule that removes decorative media. Inline semantic text does not depend on the availability of the images. Asset references are intentionally public and contain no secrets.

## Verification and honest boundaries

- Floot runtime is source-captured in `floot-production/` and checked through the content-addressed manifest and CI parity checks.
- Floot's own tests and TypeScript checks must pass. Public status and recommendation endpoints must still operate after publish.
- Browser visual review is required for exact layout acceptance at narrow mobile, tablet and desktop sizes. Server and TypeScript tests do **not** verify pixel rendering.
- Human-outcome impact is unverified. Brand visuals must not be confused with clinical efficacy, survey results, or representative resident photos.

This asset record establishes source provenance. It does not by itself establish that a redesign has been published or passed browser acceptance; those conclusions require the actual deployment and verification receipts.

**Acceptance rubric:** legible wordmark/icon; working CTA; no horizontal overflow; strong text contrast; no content obstruction by decorative media; traceable real Qloo flow; and a colorful, coherent interface at 390px, 768px, 1440px.
