# Ncanny — Architecture

## 1. Shape

A **pnpm monorepo** containing three applications and a set of shared packages. The backend is a
**modular monolith**: NestJS modules with clean domain boundaries, deliberately not microservices,
so that a service can be extracted later without rewriting its domain.

```
apps/
  api      NestJS REST API (modular monolith)
  web      Next.js App Router web client
  mobile   Expo / React Native client
  admin    (Phase 11) admin console
packages/
  types        shared enums, DTO types, API envelopes, error codes
  validation   Zod schemas shared by server and clients
  api-client   typed HTTP client with auth + refresh + error normalisation
  ui           React design system (web)
  config       shared tsconfig / eslint / prettier / tailwind preset
services/        (Phase 8+) extracted services, if and when justified
infrastructure/  (Phase 16) docker, aws, terraform
docs/            product and engineering documentation
```

Dependency direction is strictly one-way:

```
apps/*  ->  packages/api-client  ->  packages/validation  ->  packages/types
apps/web, apps/mobile -> packages/ui (web only), packages/config
```

No package imports from an app. No app imports from another app.

## 2. Runtime architecture

```
   Web (Next.js)        Mobile (Expo)        Admin (Phase 11)
         \                   |                   /
          \__________________|__________________/
                             |
                      HTTPS  |  REST /api/v1  (+ Socket.io, Phase 9)
                             |
                   ┌─────────▼─────────┐
                   │   NestJS API      │
                   │  ───────────────  │
                   │  auth    identity │
                   │  profiles schools │
                   │  subjects content │   modules with explicit boundaries
                   │  feed    review   │
                   │  gamification ... │
                   └───┬───────────┬───┘
                       │           │
              MongoDB Atlas     Redis (cache / pub-sub, Phase 9)
                       │
              S3 + CloudFront (media, Phase 4)
```

## 3. Technology decisions

| Layer | Choice | Why |
| --- | --- | --- |
| Web | Next.js (App Router) + React + Tailwind + Framer Motion | SSR/ISR for public profiles and SEO, file-based routing, first-class code splitting |
| Mobile | Expo / React Native | One codebase for Android + iOS, shares types/validation/api-client with web |
| State | Zustand | Small, typed, no boilerplate; separate stores per domain (auth, user, feed, content, notifications, gamification, 3D, UI) |
| API | NestJS | Dependency injection, module boundaries, guards/interceptors/filters map cleanly to the cross-cutting requirements (RBAC, audit, errors) |
| API style | REST (`/api/v1`) | Sufficient for the MVP's access patterns; GraphQL only if aggregation genuinely demands it (`DL-0003`) |
| Database | MongoDB (Mongoose) | Heterogeneous content metadata per content type; matches the supplied tech stack |
| Cache | `CacheService` abstraction, in-memory now, Redis later | Avoids running Redis before there is anything worth caching (`DL-0007`) |
| Media | S3 + CloudFront with signed URLs | Large media never touches MongoDB |
| Auth | First-party JWT (access + rotating refresh) behind provider interfaces | No vendor on the critical path; Firebase/Auth0/Google wire in as additional `IdentityProvider`s (`DL-0004`) |
| Real-time | Socket.io (Phase 9) | Matches the supplied stack; deferred until events exist |
| 3D | Three.js for in-page 3D, Unity WebGL for the virtual hall | Progressive enhancement only (`DL-0005`) |

## 4. Backend module boundaries

Each module owns its schemas and exposes a service; other modules consume the service, never
another module's model directly.

| Module | Owns | Exposes |
| --- | --- | --- |
| `common` | errors, envelopes, request context, logging, guards, decorators, pipes | cross-cutting primitives |
| `config` | env schema and typed config | `AppConfigService` |
| `database` | Mongo connection, index management | connection |
| `cache` | cache abstraction | `CacheService` |
| `audit` | `AuditLog` | `AuditService.record()` |
| `identity` | `User`, `UserSession`, `OtpChallenge` | user lookup/creation, session lifecycle |
| `auth` | registration, sign-in, OTP, tokens, guards | HTTP endpoints, `JwtAuthGuard`, `RolesGuard` |
| `schools` | `School` | school resolution and lookup |
| `subjects` | `Subject` | catalogue and seeding |
| `profiles` | `ScholarProfile`, `PreceptorProfile` | profile read/update, visibility rules |
| *(Phase 4+)* `media`, `content`, `review`, `feed`, `gamification`, `notifications`, `search`, `realtime`, `admin` | | |

## 5. Cross-cutting behaviour

- **Request id** — generated or taken from `x-request-id`, attached to logs and every response
  envelope, returned in the `x-request-id` header.
- **Errors** — every failure is converted by a global filter into
  `{ success: false, error: { code, message, details? }, requestId }`. Codes are enumerated in
  `@ncanny/types` so clients can branch on them without string matching. Stack traces are logged,
  never returned.
- **Validation** — the same Zod schema validates a form on the client and the body on the server.
- **Authorisation** — enforced server-side only. The JWT guard is global; public routes opt out
  explicitly with `@Public()`. Role checks use `@Roles()`. Ownership and school-boundary checks
  live in the owning service.
- **Audit** — security-relevant actions write an `AuditLog` entry (actor, action, resource,
  outcome, ip, user agent, request id).
- **Analytics** — domain events are emitted through a single `AnalyticsService` seam so a provider
  can be attached later without touching call sites.

## 6. Client architecture

**Web.** Server components render shells and public data; client components own interactivity.
Authentication state lives in a Zustand store; the API client injects the access token and
transparently refreshes on a `401` caused by expiry, retrying the original request once. Route
groups separate the unauthenticated marketing/auth surface from the authenticated application
shell. The application shell provides a persistent left rail on desktop and a bottom tab bar on
mobile, matching `docs/UI_UX.md`.

**Mobile.** Expo Router with the same store and API-client packages. Tokens are held in
`expo-secure-store`. Screens are adapted, not copied: native navigation patterns, camera/gallery
capture, platform-native form controls.

## 7. Progressive enhancement rule for 3D

Required invariant: **every feature is reachable and complete in 2D.** The 3D layer is loaded
dynamically, is never on a critical render path, and degrades automatically on devices that fail
capability detection. See `docs/GAME_DESIGN.md`.

## 8. Extensibility seams

Interfaces exist so that vendors can be added or swapped without changing callers:
`OtpDeliveryProvider`, `IdentityProvider` (Google/Firebase/Auth0), `StorageProvider` (S3),
`PaymentProvider` (Stripe/Razorpay), `SearchProvider` (Mongo → OpenSearch), `AiProvider`
(feedback, moderation, ranking), `CacheService` (memory → Redis).

## 9. Scaling path

Stateless API behind a load balancer · MongoDB Atlas with compound indexes and cursor pagination ·
Redis for hot reads and Socket.io fan-out · CloudFront for media and 3D assets · background queue
for transcoding, leaderboard recomputation and digests · extract `media`, `gamification`,
`notifications` and `search` into services only when their load profile diverges from the
monolith's.
