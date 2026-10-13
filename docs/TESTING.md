# Ncanny — Testing

## Commands

From the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Each workspace also exposes the same four scripts. API end-to-end tests run in band after the
unit tests (`pnpm --filter @ncanny/api test`).

## What is covered

| Area | Where | What it proves |
| --- | --- | --- |
| Validation | `packages/validation` | Registration, sign-in and profile schemas accept valid input and reject the cases called out in the product rules (weak passwords, mismatched confirmation, bad phone format). |
| API client | `packages/api-client` | Envelope unwrapping, error normalisation, single-flight refresh, cancellation. |
| Design system | `packages/ui` | Roles, labels, loading/disabled buttons, tab keyboard order, dialog labelling, toast dismissal, progress values. |
| Web forms | `apps/web` | Attendance validation happens before a request; rejected credentials show the API message; OTP copy does not confirm that a number is registered. |
| Mobile helpers | `apps/mobile` | Token reassembly, API URL allow-list, form errors that never echo an internal message, shared colour tokens. |
| API unit | `apps/api/src` | Password hashing, Canny ID format, visibility policy. |
| API e2e | `apps/api/test` | Registration, attendance, sessions, RBAC negatives, profile visibility, school search, subject seed. Uses `mongodb-memory-server`, so no external database is required. |

Rate limiting is off by default in the e2e harness (`RATE_LIMIT_ENABLED=false`) and forced on in
one dedicated case. Production boot refuses to start with rate limiting disabled.

## What is not covered yet

- No browser or device end-to-end suite (Playwright / Detox). The web and mobile shells are
  covered by unit tests and by production builds, not by a running API in CI.
- OTP delivery is a logging provider. Tests assert the API contract, not an SMS gateway.
- Content, feed, review and gamification have no tests because they are not built.

## CI

`.github/workflows/ci.yml` runs install, lint, typecheck, test and build on pull requests and on
pushes to `main`. A failing stage fails the job. There is no `continue-on-error`.
