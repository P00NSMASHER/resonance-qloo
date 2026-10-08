# Resonance: Cultural Atlas brand identity

**Brand concept:** Culture becomes connection. Resonance discovers cultural bridges without presuming that an aggregate affinity describes an individual. The product remains human-led.

## Assets and provenance

- Source artwork for the identity: `docs/brand/resonance-symbol.svg` (editable vector interpretation of the wave-connection idea).
- Live app emblem media: `/_cdn/static/10b9d53a-6d7b-43b2-85c4-27117e62d390.png` hosted on Floot.
- Live hero original artwork: `/_cdn/static/559ce4f0-ef12-4f04-ace1-f855c328ffa1.png` hosted on Floot.
- Canva editable identity board: https://www.canva.com/d/0eeWpsHNLaeg9bd.
- The AI-generated visual presentation is concept artwork, not an accurate screenshot of the deployed interface.

## Brand system

| Token | HEX | Intended use |
|---|---|---|
| Midnight Ink | `#14243B` | Primary type, navigation, trusted foundation |
| Peacock Teal | `#137C78` | Brand emphasis, actions, highlights |
| Warm Ivory | `#FAF7F1` | Calm page background |
| Coral | `#EDAA88` | Small accents and human warmth |
| Mist | `#E7F2EF` | Evidence chips, gentle contextual panels |
| Connection Wave | `#31B7A8` | Symbol strokes on dark backgrounds |

**Wordmark:** “Resonance,” restrained contemporary sans, paired with an editorial serif hero. Use generous clear space and never distort the wave symbol. The logo must remain recognizable without its tagline at tiny scales. Provide text alternative for meaningful brand images and empty alt for purely decorative instances.

**Tone:** clear, quietly curious, confident about what the technology actually does. Avoid medical or therapy promises; never invent quotes, impact statistics, personal memories, Qloo scores, or customer data.

**Visual story:** an art-directed still life of music, film, books, and maps connected by a graceful teal current. Decorative hero imagery only; the Qloo evidence remains real and the input flow stays usable if imagery fails to load.

**Accessibility:** at least 4.5:1 contrast for normal text and 3:1 for UI controls; visible focus styles; touch controls near 44px; meaningful responsive image crop and reduced-motion handling. Keep print outcomes legible without decorative artwork.

## Implementation notes

The actual Floot app is the source for published frontend changes. Keep the portable React source and the content-addressed `floot-production/` snapshot aligned; verify source parity and strict release receipts. Do not merge source-only brand changes until the Floot runtime snapshot, artifact dependencies, and live release are verified.

Historical judge gallery screenshots remain historical unless refreshed captures are re-collected after the redesign and explicitly identified as new.
