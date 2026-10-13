# Ncanny — Database

MongoDB, accessed through Mongoose. The schema files under `apps/api/src` are the source of
truth; this document records the collections, the constraints that protect student data, and the
indexes that exist in milestone 1.

Redis is not deployed. `CacheService` is an in-memory stand-in with the same interface a Redis
implementation will satisfy (`DL-0007`).

## Collections

| Collection | Schema | Purpose |
| --- | --- | --- |
| `users` | `apps/api/src/identity/schemas/user.schema.ts` | Account: role, status, contact, Canny ID, school |
| `user_sessions` | `apps/api/src/identity/schemas/user-session.schema.ts` | Refresh-token family, device metadata, expiry |
| `otp_challenges` | `apps/api/src/identity/schemas/otp-challenge.schema.ts` | Phone one-time codes |
| `scholar_profiles` | `apps/api/src/profiles/schemas/scholar-profile.schema.ts` | Scholar academic profile and stat scaffolds |
| `preceptor_profiles` | `apps/api/src/profiles/schemas/preceptor-profile.schema.ts` | Preceptor profile and interaction-stat scaffolds |
| `schools` | `apps/api/src/schools/school.schema.ts` | School directory and subscription scaffold |
| `subjects` | `apps/api/src/subjects/subject.schema.ts` | Curriculum catalogue |
| `audit_logs` | `apps/api/src/audit/audit-log.schema.ts` | Security-relevant events |

## Constraints that matter

- `users.passwordHash` is `select: false`. It is never returned by a query that does not ask for
  it, and it is never copied into an API response.
- `users.email` and `users.phone` are unique. Email is stored lower-cased; phone is stored in
  E.164.
- `users.cannyId` is unique and sparse. Scholars receive `NCS-######`, Preceptors `NCP-######`.
  The value is generated with a cryptographic random source and retried on collision.
- OTP codes and refresh tokens are stored as hashes. A refresh token is `<sessionId>.<secret>`;
  reuse of a rotated secret revokes the whole session family.
- `user_sessions.expiresAt` and `otp_challenges.expiresAt` are TTL indexes (`expireAfterSeconds: 0`),
  so expired rows are removed by MongoDB.
- School contact email, phone, admin id and subscription identifiers are stored on `schools` and
  are omitted from `SchoolSummary`. Anonymous and ordinary callers never receive them.
- A profile the viewer may not see is answered as not found, so visibility settings cannot be
  probed by status code.

## Indexes

- `users`: unique email, unique phone, unique sparse Canny ID, `{ schoolId, role }`, `createdAt`.
- `user_sessions`: `userId`, token family, `{ userId, revokedAt }`, TTL on `expiresAt`.
- `otp_challenges`: `{ phone, createdAt }`, TTL on `expiresAt`.
- `scholar_profiles`: unique `userId`, unique `cannyId`, `{ schoolId, grade }`, `progression.xp`.
- `preceptor_profiles`: unique `userId`, unique `cannyId`, `schoolId`.
- `schools`: `normalisedName` + city, text index on `name` for registration search.
- `subjects`: unique `code`, `{ sortOrder, name }`.
- `audit_logs`: `createdAt`, `{ actorId, createdAt }`.

## What is deliberately not stored yet

Content, media, comments, reviews, badges, notifications, messages and leaderboard snapshots
arrive with their own epics. Stat fields on profiles exist and stay at zero until those epics
write them.
