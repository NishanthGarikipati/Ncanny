# Ncanny — Implementation Plan

Structure: **EPIC → FEATURE → USER STORY → TASK → TEST**.

Status markers: `[x]` delivered · `[~]` partially delivered · `[ ]` not started.

Epics 1–3 are milestone 1 ("Foundation + Authentication + Basic Profile") and are specified at
task level. Epics 4+ are specified at feature/story level and are refined to tasks at the start of
their phase, so that the plan does not calcify around decisions that later discovery should inform.

---

## EPIC 1 — Platform Foundation (Phase 1)

### F1.1 Monorepo and toolchain
*As an engineer, I want one repository with shared types and consistent tooling, so that web,
mobile and API cannot drift apart.*

- [x] T1.1.1 pnpm workspaces: `apps/{api,web,mobile}`, `packages/{types,validation,api-client,ui,config}`
- [x] T1.1.2 Shared strict `tsconfig` base in `packages/config`
- [x] T1.1.3 Shared ESLint + Prettier configuration
- [x] T1.1.4 Root scripts: `lint`, `typecheck`, `test`, `build`
- [x] TEST: `pnpm typecheck` and `pnpm lint` pass across every workspace

### F1.2 Shared domain contracts
*As an engineer, I want one definition of roles, content types and DTOs, so that clients and server
agree by construction.*

- [x] T1.2.1 `@ncanny/types`: roles, user status, content types, visibility, subject/grade enums, API envelopes, error codes
- [x] T1.2.2 `@ncanny/validation`: Zod schemas for registration, sign-in, OTP, profile updates, pagination — reused by API and both clients
- [x] T1.2.3 `@ncanny/api-client`: typed fetch client with auth header injection, refresh-on-401, error normalisation, request cancellation
- [x] TEST: unit tests for validation schemas (accept + reject cases) and for the API client's refresh/error behaviour

### F1.3 Design system
*As a product team, we want one component library, so that pages are built from reviewed
accessible primitives rather than ad-hoc markup.*

- [x] T1.3.1 Design tokens (colour, typography, spacing, radius, elevation) with light/dark themes
- [x] T1.3.2 Primitives: Button, Input, Select, Textarea, Card, Avatar, Badge, Tag, Tabs, Toast, Modal, Spinner, StatCard, FormField, ProgressBar
- [x] T1.3.3 Application components: ProfileHeader, StatGrid, AppShell navigation (desktop rail + mobile bottom bar)
- [ ] T1.3.4 Deferred to their consuming phase: ContentCard, MediaCard, Comment, ReviewPanel, UploadWizard, Leaderboard, ChallengeCard, NotificationItem, DataTable, HUD, 3DPanel
- [x] TEST: render + accessibility assertions for primitives (roles, labels, disabled/loading states, keyboard interaction)

### F1.4 API foundation
*As an engineer, I want cross-cutting concerns solved once, so that every endpoint is observable,
validated and safe by default.*

- [x] T1.4.1 NestJS application with environment validation at boot (fails fast on bad config)
- [x] T1.4.2 MongoDB connection module with indexes
- [x] T1.4.3 Request id middleware + structured JSON logging (pino), with secret redaction
- [x] T1.4.4 Global exception filter emitting the standard error envelope; no stack traces in production
- [x] T1.4.5 Zod validation pipe
- [x] T1.4.6 Helmet, CORS allow-list, global + per-route rate limiting
- [x] T1.4.7 Swagger/OpenAPI at `/api/docs`
- [x] T1.4.8 Health endpoint (`/api/v1/health`) reporting database state
- [x] T1.4.9 Cache abstraction (in-memory implementation, Redis-ready interface)
- [x] TEST: e2e — unknown route returns the standard envelope; invalid payload returns `VALIDATION_ERROR` with field details; rate limiter returns 429; health reports database status

### F1.5 CI/CD
- [x] T1.5.1 GitHub Actions: install → lint → typecheck → test → build
- [x] T1.5.2 `.env.example` for every app; secrets never committed
- [ ] T1.5.3 Docker images and deployment stages (Phase 16)
- [x] TEST: pipeline fails when any stage fails (no `continue-on-error`)

---

## EPIC 2 — Identity and Attendance (Phase 2)

### F2.1 Registration
*As a student or teacher, I want to register with my school details, so that I get an academic
identity on Ncanny.*

- [x] T2.1.1 `POST /api/v1/auth/register/scholar` — avatar, name, school, school address, class, subjects studying, interested subjects, phone, email, password + confirmation
- [x] T2.1.2 `POST /api/v1/auth/register/preceptor` — avatar, name, school, school address, teaching subjects, knowledge areas, preceptor role, phone, email, password + confirmation
- [x] T2.1.3 School resolution: attach to an existing school by id, else provision one from the supplied name/address
- [x] T2.1.4 Canny ID issuance (`NCS-######` scholars, `NCP-######` preceptors) — collision-safe, unique-indexed
- [x] T2.1.5 Password hashing (bcrypt, cost 12); raw passwords never stored or logged
- [x] T2.1.6 Profile initialisation (role profile document created in the same request)
- [x] TEST: unit — Canny ID format/uniqueness, password hashing. Integration — happy path for both roles, duplicate email/phone rejected, weak password rejected, mismatched confirmation rejected, unknown school id rejected, response never contains a password hash

### F2.2 Attendance (sign-in)
*As a user, I want to sign in by password or by a one-time code, so that I can reach my profile.*

- [x] T2.2.1 `POST /api/v1/auth/login` — email + password
- [x] T2.2.2 `POST /api/v1/auth/otp/request` + `POST /api/v1/auth/otp/verify` — phone OTP (hashed codes, expiry, attempt limit, rate limited); delivery provider behind a `OtpDeliveryProvider` interface, currently a logging stub
- [ ] T2.2.3 Google sign-in (`IdentityProvider` interface defined; wiring deferred)
- [x] T2.2.4 Role-based post-login destination returned to the client
- [x] TEST: integration — valid login issues tokens; wrong password and unknown email return the same generic error (no account enumeration); OTP verifies once and is then invalid; expired OTP rejected; attempt limit enforced

### F2.3 Sessions
- [x] T2.3.1 Short-lived access token (JWT) + long-lived refresh token
- [x] T2.3.2 Refresh tokens stored hashed in `UserSession` with device metadata, rotated on use
- [x] T2.3.3 `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/logout-all`
- [x] T2.3.4 `GET /api/v1/auth/sessions` — login activity for the settings screen
- [x] TEST: integration — refresh rotates and invalidates the previous token; a revoked/reused refresh token is rejected; logout-all invalidates every session

### F2.4 Authorisation
- [x] T2.4.1 JWT guard applied globally, opt-out via `@Public()`
- [x] T2.4.2 `@Roles()` guard for Scholar / Preceptor / School Admin / Ncanny Admin
- [x] T2.4.3 Ownership checks on every mutation of a profile
- [x] T2.4.4 Audit log entries for registration, sign-in, sign-in failure, logout and profile update
- [x] TEST: negative tests — no token → 401; wrong role → 403; editing another user's profile → 403

### F2.5 Account recovery
- [ ] T2.5.1 Password reset request + confirm (Phase 2 follow-up)

---

## EPIC 3 — Academic Identity (Phase 3)

### F3.1 Scholar profile
*As a Scholar, I want a profile that reads like an academic character sheet, so that my work and
progress are visible.*

- [x] T3.1.1 `GET /api/v1/scholars/:cannyId` (visibility-aware) and `GET /api/v1/scholars/me`
- [x] T3.1.2 `PATCH /api/v1/scholars/me` — avatar, class, subjects, interests, bio, visibility
- [x] T3.1.3 Stats scaffold: XP, level, rank, badge count, content counts (zeroed until Epic 4/8 populate them)
- [x] T3.1.4 Web + mobile profile screen rendering identity, stats, subjects and content tabs with empty states
- [x] TEST: integration — private profile hidden from a non-connected viewer; school-visible profile visible to a schoolmate; owner always sees their own; contact details never returned to other users

### F3.2 Preceptor profile
- [x] T3.2.1 `GET /api/v1/preceptors/:cannyId`, `GET /api/v1/preceptors/me`, `PATCH /api/v1/preceptors/me`
- [x] T3.2.2 Interaction statistics scaffold (scholars interacted with, submissions reviewed, feedback given, marks given, badges awarded, content uploaded)
- [x] TEST: integration — update restricted to the owning Preceptor; a Scholar cannot PATCH a Preceptor profile

### F3.3 School
- [x] T3.3.1 School model (id, name, address, contact, admin, counts, subscription scaffold)
- [x] T3.3.2 `GET /api/v1/schools` search-as-you-type for registration, `GET /api/v1/schools/:id`
- [x] T3.3.3 Member counters maintained on registration
- [ ] T3.3.4 School administrator dashboard, analytics, subscription management (Phase 10)
- [x] TEST: integration — school search is case-insensitive and paginated; private contact fields are not returned to anonymous callers

### F3.4 Subject catalogue
- [x] T3.4.1 Subject model + idempotent seed of the standard school curriculum
- [x] T3.4.2 `GET /api/v1/subjects`
- [ ] T3.4.3 Topics, subtopics, subject pages, following (Phase 7)
- [x] TEST: integration — seed is idempotent; list is cached and ordered

---

## EPIC 4 — Content System (Phase 4) — in progress

- [x] F4.1 `media_assets` plus local disk storage (`MEDIA_ROOT`). Declared MIME is checked against magic bytes and size. Reads are authenticated base64, so a file is not a public URL. S3 signed upload, thumbnails, virus scan, and upload progress are not built (`DL-0015`).
- [x] F4.2 `works` for essay, painting, elocution, study activity, teaching notes and teaching audio, with visibility and status. Create and view only. Edit and delete are not built.
- [x] F4.3 Create flow on the web (kind, writing or file, subject, visibility, publish) and on mobile for writing. No separate preview step. Topics are not collected.
- [x] F4.4 Engagement on a visible school work: like, smile, comment (500 characters, reportable), bookmark. Not direct messages. A person's own like is stored and is not a rank signal.
- [x] F4.5 Preceptor review: score and written feedback, audited. A Preceptor can award shield, star or medal once per work, not on their own work. This is not AI grading.
- [x] TEST: content e2e covers school visibility, private work hidden from a schoolmate, preceptor-only review, rejected image bytes, hall presence that does not include an email, reactions and comments blocked for another school, badge rules, the school roster, and password change.

## EPIC 5 — Academic Feed (Phase 5) — partial

- [x] F5.1 School-scoped chronological feed with cursor pagination. The API accepts `type` and `subjectId`. The UI shows the newest school work and does not offer category chips. Challenges and achievements are not in the feed.
- [ ] F5.2 Relevance ranking by subject, grade, school and follow graph.
- [ ] F5.3 Trending, with anti-gaming safeguards.

## EPIC 6 — Whiteboard (Phase 6) — partial

- [x] F6.1 2D whiteboard of school work on web and mobile. Opening a piece uses the same reader, including the Preceptor mark form. Search, subject filters and sort controls are not in the UI.
- [ ] F6.2 Real-time board updates.
- [x] F6.3 Campus game board is the way you play with school work (`DL-0018`). Stations filter the same works, plaques open the reader, and opted-in classmates are name tokens. There is no chat and no WebGL requirement. The earlier Three.js pointer-lock hall remains in the repo and is not linked from navigation. Unity is not used. Mobile uses station chips on the same feed.

## EPIC 7 — Subject Network (Phase 7)
- F7.1 Topics and subtopics · F7.2 Subject pages · F7.3 Following · F7.4 Global search with filters · F7.5 Recommendations.

## EPIC 8 — Gamification (Phase 8)
- F8.1 XP and levels · F8.2 Badges (configurable criteria) · F8.3 Achievements and streaks · F8.4 Challenges · F8.5 Multi-signal leaderboards (global / school / subject / grade / challenge), ranking weights configurable, never likes-only.

## EPIC 9 — Real-time (Phase 9)
- F9.1 Socket.io gateway with JWT handshake · F9.2 Content, comment, like, review and notification events · F9.3 Presence where appropriate.

## EPIC 10 — Notifications (Phase 9)
- F10.1 Event-driven in-app notifications · F10.2 Push (mobile) · F10.3 Email digests · F10.4 Per-channel preferences.

## EPIC 11 — School Platform (Phase 10)
- F11.1 School profile page · F11.2 School admin console · F11.3 Analytics · F11.4 Subscriptions and payments behind a `PaymentProvider` interface (Stripe/Razorpay).

## EPIC 12 — Admin & Moderation (Phase 11)
- F12.1 Admin console · F12.2 Reports and moderation queue · F12.3 Badge/challenge/leaderboard configuration · F12.4 Audit log browser. **Gate: no public beta before F12.2 ships.**

## EPIC 13 — Messaging (Phase 11+)
- F13.1 Role-gated, school-scoped conversations · F13.2 Reporting, blocking and moderation · F13.3 School/guardian controls. **Gate: no adult↔minor direct messaging without school-level opt-in.**

## EPIC 14 — 3D World (Phase 12)
- F14.1 Avatar · F14.2 Virtual academic hall · F14.3 Navigation and interaction · F14.4 HUD · F14.5 Presence · F14.6 Device-tier asset budgets.

## EPIC 15 — Mobile Parity (Phase 13)
- F15.1 Full feature parity with adapted UX · F15.2 Camera/gallery capture · F15.3 Push notifications · F15.4 Offline-tolerant reads.

## EPIC 16 — QA, Security, Beta, Production (Phases 14–16)
- F16.1 Test matrix completion · F16.2 Penetration testing and remediation · F16.3 Accessibility audit · F16.4 Performance budgets · F16.5 Staging and beta programme · F16.6 Production infrastructure, monitoring, backups, rollback.

---

## Definition of Done (applies to every task above)

UI · mobile responsive · API · database · validation · authorisation · error handling · loading
states · empty states · tests · accessibility · security · analytics events · documentation · API
documentation · no TypeScript errors · no lint errors · tests pass · build passes.
