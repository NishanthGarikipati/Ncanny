# Ncanny — Architecture Decision Log

Format: context → decision → consequences. Decisions are append-only; superseding entries
reference the entry they replace.

---

### DL-0001 — pnpm workspaces as the monorepo tool

**Context.** The product requires web, mobile, API and admin applications sharing types and
validation. Options considered: npm workspaces, pnpm workspaces, Nx, Turborepo.

**Decision.** pnpm workspaces with plain root scripts. No build-graph tool initially.

**Consequences.** Fast installs, strict dependency isolation, no extra abstraction to learn.
Turborepo can be layered on later purely as caching if CI times grow; nothing in the layout
prevents it. Rejected Nx as over-engineering for the current size (per instruction 68).

---

### DL-0002 — Modular monolith backend, not microservices

**Context.** The supplied project plan mentions a "scalable microservice backend structure"; the
master instructions say not to create unnecessary microservices at the beginning.

**Decision.** One NestJS application with strict module boundaries. Modules own their schemas and
communicate through services, never through another module's models.

**Consequences.** Single deployment and one transaction boundary during the MVP. Extraction to
services remains mechanical because boundaries are already explicit. Revisit when a module's load
profile diverges materially (likely candidates: media, search, realtime).

---

### DL-0003 — REST first, GraphQL only on evidence

**Context.** The tech-stack document lists Apollo GraphQL as optional; the master instructions say
REST is primary and GraphQL requires justification.

**Decision.** REST under `/api/v1` with OpenAPI documentation. No GraphQL in the MVP.

**Consequences.** Simpler caching, rate limiting and authorisation. If feed/profile aggregation
later causes request waterfalls that cannot be solved with composite endpoints, GraphQL may be
introduced as an additive gateway — not as a replacement.

---

### DL-0004 — First-party JWT authentication behind provider interfaces

**Context.** The stack document suggests Firebase Auth or Auth0. The master instructions require
email+password, phone+OTP and Google sign-in, plus session management and login activity.

**Decision.** Implement authentication in the API: bcrypt passwords, short-lived access JWTs and
rotating opaque refresh tokens persisted (hashed) as `UserSession` documents. Define
`IdentityProvider` and `OtpDeliveryProvider` interfaces so Google, Firebase, Auth0 and an SMS
vendor can be added without changing call sites.

**Consequences.** No external vendor is required to run or test the platform, and session
revocation, device listing and audit logging are fully under our control — all of which are
required for student safety. Cost: we own the security of this code, so the auth module carries
the heaviest test coverage in the repository. Google sign-in remains outstanding.

---

### DL-0005 — 3D is progressive enhancement, never a dependency

**Context.** The product vision is strongly 3D, but the audience is school children, frequently on
low-end shared devices and weak connections.

**Decision.** Every feature must be complete in 2D. 3D is dynamically imported, capability-gated,
and switchable by the user. No navigation path may require WebGL.

**Consequences.** Two presentations to maintain for the Whiteboard and profile. Accepted, because
a WebGL-only path would exclude a meaningful share of the target users and make the product
untestable in CI.

---

### DL-0006 — Tests run against an in-memory MongoDB

**Context.** No MongoDB server is available in the development or CI environment, and integration
tests must cover authorisation and visibility rules, which are the parts most likely to break.

**Decision.** `mongodb-memory-server` for integration/e2e tests, with `MONGODB_URI` able to
override it for developers who prefer a real instance.

**Consequences.** Tests are hermetic and run in CI without services. The binary download is cached;
an air-gapped developer must supply their own instance. Behavioural differences from Atlas (e.g.
Atlas Search) are out of scope for the MVP and are flagged if search moves beyond text indexes.

---

### DL-0007 — Redis deferred; cache behind an interface

**Context.** The stack lists Redis for caching and real-time support. Milestone 1 has no hot read
path and no real-time features.

**Decision.** Ship a `CacheService` interface with an in-memory implementation. Add the Redis
implementation when the feed (Epic 5) or Socket.io fan-out (Epic 9) needs it.

**Consequences.** One fewer service to operate now; the swap is a single provider binding later.
In-memory caching is per-process and must not be used for anything requiring cross-instance
correctness — currently only the subject catalogue, which is immutable at runtime.

---

### DL-0008 — Canny ID format `NCS-######` / `NCP-######`

**Context.** Scholars and Preceptors need a permanent, public, human-readable academic identifier
that is safe to display and share, and that never leaks personal data.

**Decision.** Role-prefixed, zero-padded random 6-digit identifiers drawn from a cryptographic
source, uniquely indexed, retried on collision. `NCS` for Scholars, `NCP` for Preceptors.

**Consequences.** Readable and shareable, reveals nothing about the holder, and is not sequential
(so it does not disclose user counts or enable enumeration by increment). The 6-digit space per
role is adequate for early scale; widening the padding is a forward-compatible change because the
value is stored as a string.

---

### DL-0009 — Bcrypt rather than Argon2

**Context.** Argon2id is the stronger modern choice, but `argon2` is a native module that
complicates CI, Docker images and local setup across architectures.

**Decision.** `bcryptjs`-compatible `bcrypt` hashing at cost 12, with the hashing implementation
isolated in a `PasswordService`.

**Consequences.** Portable and dependency-light. Migration to Argon2id later is possible without
forced password resets by rehashing on next successful sign-in, because hashing is behind a single
service.

---

### DL-0010 — Zod as the single validation source, shared by server and clients

**Context.** The same registration rules must be enforced on the server and reflected in web and
mobile forms. Duplicating them guarantees drift.

**Decision.** Zod schemas live in `@ncanny/validation` and are consumed by the NestJS validation
pipe and by both clients. Types are inferred from the schemas, so DTO types cannot diverge from
the validation.

**Consequences.** One definition, no drift, and client/server error messages agree. Nest's
`class-validator` conventions are not used; a small custom `ZodValidationPipe` bridges the gap.

---

### DL-0011 — School auto-provisioning at registration

**Context.** A new user's school may not yet exist in the database, but registration must not be
blocked pending an administrator onboarding the school.

**Decision.** Registration either attaches to an existing school by id, or provisions an
unverified school from the supplied name and address. Unverified schools are flagged for later
administrative claim and merge.

**Consequences.** Registration always completes. Duplicate schools will accumulate and require a
merge tool in the admin console (Epic 12); the `verified` flag and normalised-name index exist so
that merge is tractable. The alternative — rejecting unknown schools — would have made onboarding
depend on operations staff.

---

### DL-0012 — Tokens in `localStorage` on web for the MVP

**Context.** The API is token-authenticated and served from a different origin than the web app.
Options: `localStorage`, in-memory only, or httpOnly refresh cookies.

**Decision.** Short-lived access token plus refresh token persisted via the client store for the
MVP, with a documented path to httpOnly, `SameSite=Strict` refresh cookies plus in-memory access
tokens before public beta.

**Consequences.** Simple and identical in shape to the mobile client. The XSS risk is real and is
mitigated by strict input validation, no raw HTML rendering and a restrictive CSP — but the
cookie-based migration is a **pre-beta requirement**, tracked in `SECURITY.md`, not an optional
improvement.

---

### DL-0013 — One React 19 type package for Next, React 18 types stay on mobile

**Context.** Expo SDK 52 requires React 18, while the web app uses React 19. pnpm's virtual store
hoisted `@types/react@18` where Next's declaration files look for types, so the web project saw
two incompatible `ReactNode` definitions and failed to typecheck.

**Decision.** `pnpm.packageExtensions` adds `@types/react@19.3.0` and `@types/react-dom@19.3.0` as
dependencies of `next`, so Next resolves React 19 types from its own folder. Mobile keeps
`@types/react@18`.

**Consequences.** Web typecheck is stable across installs. Do not replace this with a root
`overrides` entry that forces every workspace onto one `@types/react`: that would typecheck the
Expo app against the wrong React generation.

---

### DL-0014 — Mobile tokens live in the platform secure store

**Context.** DL-0012 keeps web tokens in `localStorage` until the httpOnly-cookie migration.
A phone has a better store available.

**Decision.** The Expo app writes the access token, refresh token and expiry as three separate
secure-store items (`expo-secure-store`). They are split because a single value is capped at
2 KB on iOS, and the pair together can exceed that.

**Consequences.** A lost or rooted device is still a threat, but tokens are not in a readable
preferences file. The web cookie migration does not change this mobile choice.

---

### DL-0015 — Media bytes on local disk until object storage exists

**Context.** Content needs images and audio, and those files must not be publicly addressable.
S3 and CloudFront are the planned store. They are not configured in this environment.

**Decision.** `MediaStorage` writes files under `MEDIA_ROOT` (or the OS temp directory). The
client uploads base64 JSON. The server sniffs magic bytes and rejects a type that does not match.
Reads go through `GET /content/:id/media` and are wrapped in the normal auth envelope.

**Consequences.** A single API process can serve the create loop and the tests. The files do not
survive a new machine, and they are not suitable for more than one API instance. Replacing the
storage class with signed S3 URLs does not change the content API shape the clients already call
for metadata. Virus scanning and thumbnails remain outstanding.

---

### DL-0016 — The academic hall is Three.js, not Unity

**Context.** The product vision includes a walkable 3D whiteboard. Unity WebGL is large, needs a
separate build pipeline, and is a poor fit for the first functioning hall. DL-0005 already
requires a complete 2D path.

**Decision.** The web app dynamically imports a Three.js hall when the user chooses it. Panels
show the same school works as the 2D whiteboard and open the same reader. Presence is an opt-in
nameplate (name and Canny ID) with no chat. Reduced motion disables pointer-lock walking. Mobile
stays on the 2D whiteboard.

**Consequences.** The hall is a real, navigable scene tied to live data. It is not a Unity client,
it does not sync movement over the network, and it is absent on phones. A later Unity build can
sit beside this scene; it must not become the only way to read school work.

---

### DL-0017 — React Native libraries keep React 18 types

**Context.** DL-0013 gives Next its own `@types/react@19`. Installing `@types/three` changed which
copy pnpm hoists into `node_modules/.pnpm/node_modules`, so Expo libraries that do not depend on
`@types/react` started resolving React 19 types. Their components then failed to typecheck inside
the React 18 mobile app.

**Decision.** `packageExtensions` also adds `@types/react@18.3.31` to `expo-router`,
`react-native-safe-area-context`, `react-native-screens`, and the `@react-navigation` packages the
app renders. There is still no workspace-wide override.

**Consequences.** Mobile typecheck stays on React 18 types even when the hoisted copy is React 19.
A new React Native library that ships JSX types may need the same extension.

---

### DL-0018 — The campus is a game board, not a first-person room

**Context.** The supplied concepts show a gaming academic social network: framed HUD panels,
a character-sheet profile, and a whiteboard you play with classmates. A pointer-lock hall reads
as a camera demo. The request was to rebuild the product so it feels like those images.

**Decision.** The signed-in web app is a campus. Stations (Library, Studio, Stage, Laboratory,
Faculty) filter the same school works. Clicking a plaque opens the reader. Classmates who opt in
appear as name tokens. There is still no chat. Dark HUD styling is the default; light remains a
setting. The first-person hall is no longer a navigation path.

**Consequences.** 2D and the campus show the same works. WebGL is not required to play. Mobile
keeps a station-filtered list of the same feed. Unity and proximity chat stay out.
