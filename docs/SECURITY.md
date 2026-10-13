# Ncanny — Security and Safety

Ncanny processes personal data belonging to **minors**. Safety is an architectural constraint, not
a feature. Where safety and convenience conflict, safety wins.

## 1. Threat model (primary concerns)

| # | Threat | Control |
| --- | --- | --- |
| T1 | Adult gaining inappropriate contact with a student | Messaging deferred; when built: role-gated, school-scoped, auditable, reportable, school opt-in required for adult↔minor channels |
| T2 | Leakage of student PII (phone, email, address, school, class) | Contact fields are never returned to other users; visibility-aware serialisers; school isolation |
| T3 | Account takeover | bcrypt(12) hashing, rotating refresh tokens, session revocation, rate limiting, generic auth errors, optional MFA |
| T4 | Enumeration of accounts/schools | Identical responses for unknown-email and wrong-password; OTP responses do not reveal registration status |
| T5 | Harmful or abusive content | Moderation status on content, reporting and blocking models, admin queue gating public beta |
| T6 | Malicious media upload | MIME + size validation, server-side signing with constrained content type, scan hook before publish, media served from an isolated origin |
| T7 | Horizontal privilege escalation | Server-side ownership checks on every mutation; never trust client-supplied ids or roles |
| T8 | Injection / XSS / CSRF | Zod validation on every input, sanitisation of rich text, no raw HTML rendering, token-based auth (not ambient cookies) for the API, helmet security headers |
| T9 | Audit gaps | `AuditLog` for authentication, profile changes, reviews, moderation, admin actions |

## 2. Authentication

- Passwords: minimum 10 characters with mixed character classes, bcrypt cost 12, never logged,
  never returned, never included in any serialiser.
- Access token: short-lived JWT (default 15 minutes) carrying `sub`, `role`, `cannyId`,
  `schoolId`, `sessionId` only.
- Refresh token: opaque random 256-bit value, stored **hashed** in `UserSession`, rotated on every
  use. Presenting a rotated token revokes the session family (reuse detection).
- OTP: 6 digits, stored hashed, 5-minute expiry, maximum 5 verification attempts, request rate
  limited per phone number and per IP.
- Logout revokes the current session; logout-all revokes every session of the user.

## 3. Authorisation

Enforced exclusively on the server:

1. **Authentication** — valid, unexpired access token with a live session.
2. **Role** — `@Roles(UserRole.PRECEPTOR)` style declarations.
3. **Ownership** — the acting user owns the resource being mutated.
4. **School boundary** — cross-school reads are permitted only for `PUBLIC` resources.
5. **Visibility** — `PUBLIC` / `SCHOOL` / `CONNECTIONS` / `PRIVATE` evaluated per viewer.
6. **Input validation** — Zod schema per endpoint; unknown fields are stripped.

Frontend checks exist for UX only and are never the security boundary.

## 4. Privacy defaults for minors

- Scholar profile visibility defaults to `SCHOOL`, not `PUBLIC`.
- Phone and email are visible only to the owner and (for operational purposes) platform admins.
- School address is shown at school level, never as a student's personal address.
- Date of birth is not collected in the MVP; grade/class is sufficient for product behaviour.
- Analytics events carry pseudonymous ids and never content bodies or contact details.

## 5. Transport, headers and limits

HTTPS everywhere · HSTS, `X-Content-Type-Options`, frame-ancestors denial and a restrictive
referrer policy via helmet · CORS restricted to a configured allow-list (no wildcard with
credentials) · global rate limiting with stricter per-route limits on registration, sign-in and
OTP · request body size limits · payload compression.

## 6. Secrets

Never committed. Every application ships an `.env.example` with placeholder values only.
Production secrets come from the platform's secret manager (AWS Secrets Manager / SSM). The API
fails to boot if a required secret is missing or if `JWT_SECRET` is left at its development
default while `NODE_ENV=production`.

## 7. Logging hygiene

Structured JSON logs with an explicit redaction list covering `password`, `confirmPassword`,
`token`, `refreshToken`, `accessToken`, `otp`, `code`, `authorization` and `cookie`. Error
responses carry a request id; stack traces and internal messages stay in the logs.

## 8. Outstanding security work (tracked)

- Password reset flow (Epic 2 follow-up)
- Media scanning implementation (Epic 4)
- Content reporting, blocking and moderation queue (Epic 12) — **blocks public beta**
- MFA enrolment UI (Epic 2 follow-up)
- Penetration test and remediation (Epic 16)
