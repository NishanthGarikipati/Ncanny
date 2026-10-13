# Ncanny — HTTP API

Base path: `/api/v1`. Interactive reference: `/api/docs` (Swagger, generated from the same Zod
schemas the server validates with).

Every response is an envelope:

```json
{ "success": true, "data": {}, "requestId": "…" }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [] }, "requestId": "…" }
```

`details` is present for validation failures and lists `{ field, message }`. Production responses
never include a stack trace. Error codes live in `@ncanny/types` (`ErrorCode`).

Authentication is a bearer access token. Routes are authenticated unless marked `@Public()`.
Role limits are enforced by `@Roles()` on the server; the clients do not decide this.

## Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register/scholar` | Public | Creates the user, the Scholar profile and a Canny ID. Returns a session. |
| POST | `/auth/register/preceptor` | Public | Same for a Preceptor. |
| POST | `/auth/login` | Public | Email + password. Unknown email and wrong password return the same error. |
| POST | `/auth/otp/request` | Public | Always reports success for a well-formed number. Rate limited. |
| POST | `/auth/otp/verify` | Public | Single use. Attempt-limited. |
| POST | `/auth/refresh` | Public | Rotates the refresh token. Reuse revokes the family. |
| POST | `/auth/logout` | Bearer | Revokes the presented refresh token. |
| POST | `/auth/logout-all` | Bearer | Revokes every session for the user. |
| GET | `/auth/me` | Bearer | The signed-in account, including contact details. |
| GET | `/auth/sessions` | Bearer | Login activity for the settings screen. |

Registration accepts either `schoolId` or `schoolName` + `schoolAddress`. An unknown id is
rejected. A name that does not match an existing school creates an unverified school; it does
not attach the user to a school they guessed (`DL-0011`).

A successful sign-in returns `{ user, tokens, redirectTo }`. `redirectTo` is chosen by the
server from the role.

## Profiles

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/scholars/me` | Scholar | Own profile, including fields hidden from other people. |
| PATCH | `/scholars/me` | Scholar | Partial update. Empty body is rejected. |
| GET | `/scholars/:cannyId` | Optional | Visibility-aware. Hidden profiles are 404. |
| GET | `/preceptors/me` | Preceptor | Own profile. |
| PATCH | `/preceptors/me` | Preceptor | Partial update. A Scholar cannot call this. |
| GET | `/preceptors/:cannyId` | Optional | Visibility-aware. Hidden profiles are 404. |

There is no route that edits another user's profile.

Contact fields (email, phone, password hash) are not present on profile responses.

## Reference data

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/schools` | Public | Cursor-paginated search (`q`, `limit`, `cursor`). |
| GET | `/schools/:id` | Public | `SchoolSummary` only. Contact and subscription are omitted. |
| GET | `/subjects` | Public | Active catalogue, ordered. |
| GET | `/health` | Public | `{ status, database, uptimeSeconds }`. |

## Limits

Auth routes are throttled more tightly than the global limit (10 requests/minute for sign-in
and registration, 5/minute for OTP). The global limit is configured with `RATE_LIMIT_*` and
cannot be disabled in production.
