# Ncanny — Design system

Package: `@ncanny/ui`. Web consumes it as TypeScript source (`transpilePackages` in the Next.js
app). Mobile does not render these DOM components; it reads the same colour values from
`@ncanny/ui/tokens` and paints them with React Native.

## Tokens

`packages/ui/src/tokens.ts` holds two palettes, `lightTheme` and `darkTheme`, as `R G B` channel
triples. The web app writes them to CSS variables (`paletteToCssVariables`) and Tailwind resolves
semantic names (`bg-surface`, `text-content`, `bg-primary`) through
`packages/config/tailwind.preset.js`. Mobile calls `channelColor` on the same triples.

Light is the default. It is the more readable option on the low-cost screens many Scholars use.
Dark follows the system setting on both clients and can be switched explicitly on the web.

Neon is an accent (`accent`, `shadow-hud`), not the colour of resting surfaces.

## Components

Primitives: `Button`, `Input`, `Textarea`, `Select`, `FormField`, `Card`, `CardHeader`, `Avatar`,
`Badge`, `Tag`, `Tabs`, `TabPanel`, `Alert`, `EmptyState`, `LoadingState`, `Skeleton`, `Spinner`,
`StatCard`, `ProgressBar`, `Modal`, `ToastProvider`.

Application pieces: `ProfileHeader`, `SideNav`, `BottomNav`, `AppShell`.

Links in the shell are rendered by the host (`next/link` on the web) so the package does not
depend on a router.

## Accessibility rules encoded in the components

- Every interactive control has a visible focus ring.
- `md` and `lg` buttons are at least 44px tall. `sm` is only for dense desktop toolbars.
- Motion is disabled under `prefers-reduced-motion`.
- A loading button sets `aria-busy` and ignores activation.
- `FormField` wires `htmlFor`, `aria-describedby` and `aria-invalid`, and announces errors with
  `role="alert"`.
- Tabs follow the WAI-ARIA pattern: arrow keys move the selection, only the active tab is in the
  tab order.
- `Modal` moves focus in, traps it, closes on Escape, and restores focus on close.
- Toasts are a polite live region. Errors use `role="alert"`. They do not steal focus.
- Badges and alerts always include text. Colour is never the only signal.
- Avatars expose the person's name as the image alternative. Initials are hidden from assistive
  technology because the name is rendered beside them.

## Navigation

Signed-in web and mobile shells use the same five destinations: Home, Explore, Create, Activity,
Profile. On the web, Create is the prominent centre action of the bottom bar below the `lg`
breakpoint and a rail item above it. Explore, Create and Activity explain that their features
ship in a later milestone rather than presenting an empty feed as if it were broken.

## Not in this milestone

`ContentCard`, `MediaCard`, `Comment`, `ReviewPanel`, `UploadWizard`, `Leaderboard`,
`ChallengeCard`, `NotificationItem`, `DataTable`, HUD and 3D panels. They are added with the
feature that needs them.
