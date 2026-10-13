# Ncanny — Current State Analysis (Phase 0)

> Produced during **Phase 0 — Repository Discovery**, before any production code was written.
> Last reviewed: milestone 1 (Foundation + Authentication + Basic Profile).

## 1. Discovery method

The following inputs were inspected:

| Input | Result |
| --- | --- |
| Git repository (`/workspace`) | Single commit (`Initial commit`), only `README.md` containing the line `# Ncanny` |
| `package.json` files | None present |
| Existing applications (web / mobile / api / admin) | None present |
| Dependencies / lockfiles | None present |
| Environment configuration | None present |
| Existing UI components / assets | None present in repository |
| Existing 3D assets (Unity, Blender, glTF) | None present in repository |
| Database configuration | None present |
| Supplied product documentation | `Project_Plan.pdf`, `tech_stack_for_Ncanny.pdf`, `Day_by_Day_Plan_for_execution.pdf` |
| Supplied visual concepts | 13 concept renders (Scholar Profile, Elocution player, Registration, Settings, Whiteboard 2D/3D, Essay card, mobile profile, Content upload, Sign-in/Attendance, School page) + 1 tech-stack diagram |

**Conclusion: the repository is greenfield.** There is no existing implementation to preserve, so
"do not rewrite existing code unnecessarily" does not constrain milestone 1. From this point on it
does: every later phase must extend what is described in `ARCHITECTURE.md` rather than replace it.

## 2. Existing architecture

None. The architecture described in `docs/ARCHITECTURE.md` is the first one, derived from the
supplied tech-stack document and the master product instructions.

## 3. Existing technologies

None in the repository. The runtime available in the development environment is Node.js 22,
npm 10 and pnpm 10. No MongoDB or Redis server is installed locally, which drives two decisions
recorded in `DECISION_LOG.md` (`DL-0006`, `DL-0007`): tests run against an in-memory MongoDB and
Redis is an optional dependency for milestone 1.

## 4. Existing features

None. Everything in the master instruction document is unbuilt.

## 5. Feature inventory and gaps

Status legend: **Done** = implemented and tested in this milestone · **Partial** = foundations
exist, feature incomplete · **Missing** = not started.

### Platform foundations

| Capability | Status | Notes |
| --- | --- | --- |
| Monorepo + TypeScript strict | Done | pnpm workspaces, `apps/*` + `packages/*` |
| Shared types / validation / API client packages | Done | `@ncanny/types`, `@ncanny/validation`, `@ncanny/api-client` |
| Design system | Partial | Core primitives shipped; `DataTable`, `Leaderboard`, `UploadWizard`, `HUD`, `3DPanel` missing |
| API foundation (errors, logging, request ids, Swagger) | Done | Standard error envelope, pino logging, OpenAPI at `/api/docs` |
| MongoDB | Done | Mongoose models for milestone-1 domains |
| Redis | Missing | Interface-ready (`CacheService` abstraction); no Redis dependency yet |
| CI/CD | Partial | GitHub Actions lint/typecheck/test/build; no deploy stage |
| Containerisation / IaC | Missing | `infrastructure/` not yet created |

### Product features

| Capability | Status |
| --- | --- |
| Scholar registration, Preceptor registration | Done |
| Attendance (sign-in): email + password | Done |
| Attendance: phone + OTP | Partial (full flow + tests; delivery provider is a logged stub) |
| Attendance: Google sign-in | Missing (interface defined, not wired) |
| Session management, refresh tokens, logout, logout-all | Done |
| Password reset | Missing |
| RBAC (Scholar / Preceptor / School Admin / Ncanny Admin) | Done |
| Canny ID issuance | Done |
| Scholar profile (read/update, stats scaffold) | Done |
| Preceptor profile (read/update, stats scaffold) | Done |
| School entity + directory | Partial (entity, lookup, auto-provision on registration; no admin console) |
| Subjects / topics | Partial (subject catalogue + seed; topics/subtopics missing) |
| Content system (essay / elocution / painting / study activity) | Partial (create, view, school visibility, Preceptor mark; no edit, delete, comments or likes) |
| Academic feed | Partial (school chronological feed; no ranking, trending or category chips) |
| Whiteboard 2D / 3D | Partial (2D wall on web and mobile; web Three.js hall, capability-gated; no search, filters, realtime or Unity) |
| Gamification (XP, levels, badges, ranks, leaderboards) | Missing (XP/level fields reserved on profiles) |
| Real-time (Socket.io) | Missing |
| Notifications | Missing |
| Messaging | Missing |
| Search | Missing |
| Settings | Partial (theme + account shell on web) |
| School subscription / payments | Missing |
| Admin console | Missing |
| Mobile app | Partial (attendance, registration, profile, writing, whiteboard; the hall is web-only) |

## 6. Technical risks

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | 3D/Unity WebGL payloads are large and GPU-dependent; children's devices are often low-end | High | 3D is an enhancement, never a dependency. 2D mode is the default and is feature-complete; capability detection selects the tier (`docs/GAME_DESIGN.md`) |
| R2 | Platform processes minors' personal data (school, class, phone) | High | Safest-by-default visibility, school-scoped isolation, audit logging, no public exposure of contact data (`docs/SECURITY.md`) |
| R3 | Unrestricted adult↔minor messaging | High | Messaging deferred; when built it must be role-gated, school-scoped, auditable and reportable |
| R4 | Media volume and cost (video elocution uploads) | Medium | S3 + CloudFront + signed URLs, server-side limits, transcoding deferred to a background worker |
| R5 | Feed/leaderboard read amplification at scale | Medium | Pagination-first APIs, cache abstraction in place, denormalised counters planned |
| R6 | Vendor lock-in (Firebase Auth / Auth0 / AI vendors / payment providers) | Medium | Provider-agnostic interfaces; milestone 1 ships a first-party JWT implementation so no vendor is on the critical path |
| R7 | Monorepo build times once Unity artefacts are added | Low | Unity output treated as a build artefact fetched at deploy time, not committed |
| R8 | Single-document ambiguity between the three planning PDFs (e.g. GraphQL, microservices) | Low | Priority order defined in the master instructions; resolutions recorded in `DECISION_LOG.md` |

## 7. Dependency risks

- **Expo / React Native** upgrade cadence is fast; pinned to the current SDK and isolated behind `packages/api-client` and `packages/types` so upgrades do not ripple.
- **Mongoose 8** — schema definitions are centralised under `apps/api/src/**/schemas` so a storage change stays contained.
- **mongodb-memory-server** downloads a MongoDB binary on first test run. CI caches it; developers without network egress can point `MONGODB_URI` at a real instance instead.
- **Three.js / Unity WebGL** are not yet dependencies. They enter only at Phase 6/12 and must stay behind a dynamic import boundary.

## 8. Architecture gaps (to close in later phases)

1. No cache layer wired (Redis) — the `CacheService` abstraction exists but has only an in-memory implementation.
2. No object storage — media upload signing (`MediaAsset`, S3) is Phase 4.
3. No event bus — gamification, notifications and analytics all need one; a lightweight in-process emitter with a queue-ready interface is planned for Phase 8.
4. No background job runner — needed for transcoding, leaderboard recomputation and digest notifications.
5. No search infrastructure — MongoDB text indexes first, OpenSearch behind a `SearchProvider` interface later.
6. No moderation pipeline — report/block models must land before public beta.

## 9. Recommended implementation order

The master instruction phases are sound; this is the sequencing actually recommended after
discovery, with the rationale for the two deviations noted.

1. **Foundation** (monorepo, types, design system, API shell, DB, errors, logging, CI) — *done*
2. **Authentication + roles + sessions** — *done*
3. **Profiles + Canny ID + School + Subjects** — *done (basic)*
4. **Content system** (one vertical slice end-to-end: Essay, then Painting, Elocution, Study Activity) — next
5. **Media pipeline** (S3 signed uploads) — must land with or immediately before content, otherwise content is untestable
6. **Feed**, then **Whiteboard 2D**
7. **Reviews / comments / likes / marks / badges** (the Preceptor loop — this is the product's core value, pulled *earlier* than the master ordering which places badges inside Phase 8)
8. **Gamification** (XP, levels, ranks, leaderboards)
9. **Search + subject network**
10. **Real-time** (Socket.io) — deferred until there are events worth pushing
11. **School platform + subscriptions**
12. **Admin console + moderation** — must precede any public beta
13. **3D Whiteboard / profile** (progressive enhancement)
14. **QA / security hardening / beta / production**

Deviations from the master phase list and why:

- **Media before content** — content APIs cannot be exercised end-to-end without upload signing.
- **Review loop before gamification** — XP and badges are derived from reviews; building the
  rewards before the thing being rewarded would produce throwaway work.

## 10. What the foundation milestone delivered

See `docs/IMPLEMENTATION_PLAN.md` (Epic 1–3). In short: monorepo foundation, API with
authentication and RBAC, Scholar/Preceptor registration and sign-in, Canny ID, basic profiles, a
shared design system, a responsive web shell and an Expo mobile shell, with unit, integration and
e2e tests and a CI pipeline.

## 11. What the content and hall milestone delivered

School-scoped works (essay, painting, elocution, study activity, teaching notes, teaching audio),
local media with magic-byte checks, a Preceptor mark, reports that flag a piece, a 2D whiteboard
on web and mobile, and a Three.js academic hall on the web. The hall reads the same works, opens
the same reader, and shows opt-in nameplates. It does not add chat.

Still absent, on purpose: S3, edit/delete, comments, likes, search filters, realtime updates,
Unity, mobile 3D, XP and badges for publishing, and a moderation console.
