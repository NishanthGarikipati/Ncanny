# Ncanny — UI/UX Direction

Derived from the supplied visual concepts (Scholar Profile, Attendance/Sign-in, Registration,
Elocution player, Whiteboard 2D and 3D, Essay card, Settings, School page, Content upload, mobile
profile) and reconciled with the accessibility and readability rules in the master instructions.

## 1. Direction

Futuristic · academic · youthful · premium · playful · professional · inclusive.

The concept art is **heads-up-display styling applied to an academic product**, not a neon arcade.
The production interpretation keeps the HUD language — framed panels, corner accents, luminous
focus states, badge and rank chips, progress rails — while meeting contrast and readability
requirements.

### Rules taken from the concepts, and the limits applied

| Concept cue | Production rule |
| --- | --- |
| Saturated cyan/magenta neon on dark | Keep as **accent**, never as body text or large surfaces. Accents carry a contrast-safe variant used for text and icons |
| Dark background everywhere | Dark is a *theme*, not the default. Light is default; both ship, both are first-class |
| Glowing outlines on every element | Glow reserved for focus, achievement and live state. Resting components use border + elevation |
| Dense HUD chrome | Chrome is trimmed at mobile widths; content outranks decoration |
| Animated everything | Motion is purposeful and short (120–240ms). All motion respects `prefers-reduced-motion` |

## 2. Design tokens

Semantic tokens only in product code — components never reference raw palette values.

- **Colour** — `surface`, `surface-raised`, `surface-sunken`, `border`, `text`, `text-muted`,
  `primary` (Ncanny cyan), `accent` (magenta), `success`, `warning`, `danger`, `info`, plus
  on-colour pairs. Every pair is contrast-checked in both themes.
- **Typography** — one display face for headings/HUD labels, one highly legible face for body and
  long-form academic text (essays are read on this platform; readability is a product
  requirement). Scale: `display`, `h1`–`h4`, `body-lg`, `body`, `body-sm`, `caption`, `label`.
- **Spacing** — 4px base scale.
- **Radius** — `sm` 6, `md` 10, `lg` 16, `xl` 24, `full`.
- **Elevation** — four levels; the top two add an accent glow in dark theme only.
- **Motion** — `fast` 120ms, `base` 180ms, `slow` 240ms, standard easing; disabled under reduced
  motion.

## 3. Layout

**Web.** Persistent left navigation rail from `lg` upwards; a top bar with global search,
notifications and the user menu; a content column with an optional right rail (stats, trending,
suggestions). Below `lg` the rail collapses into a bottom tab bar and the right rail moves inline
below the content.

**Mobile.** Bottom navigation: **Home · Explore · Create · Activity · Profile**, with Create as the
prominent central action. Secondary destinations (Subjects, Challenges, Notifications, Messages,
Settings) live in the profile/menu surface.

Breakpoints: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.

## 4. Signature surfaces

**Profile = academic character sheet.** Avatar, name, Canny ID chip, school, grade; level and XP
rail; badge and rank row; subject chips; then content tabs — Paintings, Essays, Elocution, Study
Activities — each with a designed empty state that proposes the next action rather than showing a
blank panel.

**Attendance (sign-in).** Email+password and phone+OTP presented as peer tabs rather than one
hidden behind a link, because OTP is expected to be the dominant path on shared family devices.
Google sign-in sits as a third option. The page states plainly that it is a sign-in page; the
"Attendance" name is product vocabulary, used as the heading, with the action labelled clearly.

**Registration.** Role selection first (Scholar / Preceptor), then a stepped form. Steps are short
enough to complete on a phone: identity → school → subjects → credentials. Progress is visible and
a step can be revisited without losing input.

**Whiteboard.** A filterable wall of academic work. Preceptor affordances (comment, mark, like,
badge) are attached to each item and are visible only to users who hold the capability.

**Create.** One central action opening four clear choices (Essay, Elocution, Painting, Study
Activity), each leading to a short wizard: compose/upload → subject & topic → preview →
visibility → submit, ending in an achievement acknowledgement that links to the published item.

## 5. Content and tone

Vocabulary is consistent and student-appropriate: *Scholar*, *Preceptor*, *Canny ID*,
*Attendance*, *Whiteboard*, *Marks*, *Badges*, *Ranks*. Error messages say what happened and what
to do next, never expose internals, and never blame the user.

## 6. Accessibility requirements (non-negotiable)

Full keyboard operability with a visible focus ring on every interactive element · semantic
landmarks and headings · labelled form controls with errors linked by `aria-describedby` and
announced politely · 4.5:1 contrast for text and 3:1 for interface elements in both themes ·
status communicated by icon and text as well as colour · media controls keyboard-accessible with
captions/transcripts where available · `prefers-reduced-motion` honoured globally · touch targets
at least 44×44px.

## 7. States

Every data surface defines four states: **loading** (skeletons matching final layout, not
spinners), **empty** (explains the surface and offers the primary action), **error** (plain
explanation plus retry), **populated**. Lists paginate or virtualise; nothing loads unbounded.
