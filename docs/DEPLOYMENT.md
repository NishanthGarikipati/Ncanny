# Ncanny — Deployment

## 1. Environments

| Environment | Purpose | Data |
| --- | --- | --- |
| Development | Local machines | Local or ephemeral MongoDB; no real student data |
| Test | Automated tests in CI | In-memory MongoDB, created and destroyed per run |
| Staging | Pre-release verification and beta | Separate Atlas cluster, anonymised data only |
| Production | Live service | Atlas with backups, restricted access, audit logging |

Configuration comes exclusively from environment variables, validated at boot. The API refuses to
start when a required variable is missing, or when a development default (such as `JWT_SECRET`) is
still in place while `NODE_ENV=production`.

## 2. Local development

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

pnpm --filter @ncanny/api dev     # http://localhost:4000, docs at /api/docs
pnpm --filter @ncanny/web dev     # http://localhost:3000
pnpm --filter @ncanny/mobile dev  # Expo
```

A MongoDB instance is required for the API (`MONGODB_URI`); Docker Compose for MongoDB and Redis
lands with `infrastructure/` in Phase 16. Tests need no services.

## 3. Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests to `main` and `develop`:

```
install → lint → typecheck → test → build
```

No stage may be marked `continue-on-error`. A failing pipeline blocks merge, and a failing build
is never deployed.

Branching: `main` (production) · `develop` (integration) · `feature/*` · `release/*` · `hotfix/*`.

## 4. Target production topology

| Component | Target |
| --- | --- |
| Web | Vercel, or S3 + CloudFront with a Node runtime for SSR |
| API | Containers on ECS/Fargate (or EC2) behind an ALB, ≥2 instances across availability zones |
| Database | MongoDB Atlas, multi-region, automated backups, point-in-time restore |
| Cache / pub-sub | ElastiCache for Redis (from Phase 9) |
| Media | S3 private buckets fronted by CloudFront with signed URLs |
| 3D assets | S3 + CloudFront with long-lived immutable cache headers |
| Mobile | EAS Build → App Store and Google Play; OTA updates for JS-only changes |
| Secrets | AWS Secrets Manager / SSM Parameter Store |
| Logs & metrics | CloudWatch, with OpenTelemetry export and an error tracker (Sentry or equivalent) |

The API is stateless: sessions live in MongoDB, not in process memory, so instances scale
horizontally and can be replaced freely.

## 5. Release process

1. Merge to `develop`; CI must be green.
2. Deploy `develop` to staging automatically.
3. Verify: smoke tests, accessibility spot-check, performance budget check.
4. Cut `release/x.y.z`, deploy to production as a rolling update behind health checks.
5. Monitor error rate, latency and authentication failure rate for the first 30 minutes.
6. Roll back by redeploying the previous image tag; database migrations must be
   backward-compatible for one release so rollback never requires a data restore.

## 6. Operational readiness checklist (before public beta)

- [ ] Automated backups verified by a restore rehearsal
- [ ] Alerting on error rate, p95 latency, authentication failures, queue depth
- [ ] Rate limits tuned against real traffic
- [ ] Moderation queue staffed and reachable
- [ ] Incident runbook and on-call rotation
- [ ] Data deletion and export procedure for schools and guardians
- [ ] Penetration test completed and findings remediated
- [ ] Refresh tokens migrated to httpOnly cookies on web (`DL-0012`)
