# Ncanny — Product Requirements

## 1. Product

**Ncanny** is an academic social network and gamified learning platform for school students,
teachers and schools. Academic and creative activities — essay writing, elocution, painting and
study activities — are presented as participatory, game-like experiences rather than as file
uploads.

Core loop: **LEARN → CREATE → PLAY → SHARE → REVIEW → EARN → CONNECT**

## 2. Mission and values

Connect school students through academic profiling and subject networking by letting them
demonstrate essay writing, elocution and painting, so they can grow, connect and excel in a
supportive, inclusive environment.

Values: **Creativity · Collaboration · Excellence · Inclusion · Integrity.**

Each value has a product consequence, and these are treated as requirements:

| Value | Product consequence |
| --- | --- |
| Creativity | Multiple expression formats; no single "correct" submission shape |
| Collaboration | Peer feedback and subject communities rank alongside competition |
| Excellence | Ranking weights teacher evaluation above raw popularity |
| Inclusion | Accessibility, 2D parity with 3D, low-end device support, no pay-to-win |
| Integrity | Audit logging, moderation, attribution, no AI grading presented as teacher grading |

## 3. Users

| Role | Description | MVP |
| --- | --- | --- |
| Scholar | School student. Owns a Canny ID, creates content, receives feedback and recognition | Yes |
| Preceptor | Teacher/educator. Reviews, comments, marks, likes, awards badges, uploads teaching content | Yes |
| School Administrator | Manages a school's users, analytics and subscription | Yes (role + auth; console in Phase 10) |
| Ncanny Administrator | Platform operations, moderation, configuration | Yes (role + auth; console in Phase 11) |
| Parent/Guardian, Content Moderator, Institution Administrator | — | Future |

## 4. Key entities

- **Canny ID** — the permanent public academic identifier of a Scholar or Preceptor. Every content
  submission is linked to it.
- **Content** — a generic item with a type (`PAINTING`, `ESSAY`, `ELOCUTION`, `STUDY_ACTIVITY`,
  `TEACHER_VIDEO`, `TEACHER_PRESENTATION`) plus type-specific metadata.
- **School** — the organisational and privacy boundary.
- **Subject / Topic** — first-class entities that drive networking, discovery and challenges.
- **Whiteboard/Blackboard** — the signature browsing and review surface, available in 2D and
  (later) 3D.

## 5. Functional requirements by area

Full detail lives in `IMPLEMENTATION_PLAN.md`. Summary of the MVP commitment:

**Must have** — authentication; Scholar, Preceptor and School profiles; Canny ID; essay, painting,
elocution and study-activity upload; academic feed; Whiteboard; comments; likes; teacher marks;
teacher badges; peer feedback; subjects; search; notifications; settings; basic gamification;
responsive web; mobile application.

**Should have** — challenges; leaderboards; school dashboard; subscriptions; real-time
interactions; 3D profile; 3D Whiteboard.

**Later** — AI ranking; plagiarism detection; AI essay feedback; voice analysis; AR/VR rooms;
offline mobile mode; premium content marketplace.

## 6. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Platforms | Responsive web (desktop/laptop/tablet/mobile browser), Android, iOS |
| Performance | Fast initial load; lazy loading; code splitting; CDN media; paginated and virtualised lists |
| Resilience | Fully usable with 3D disabled, WebGL unavailable, weak GPU or poor connectivity |
| Accessibility | Keyboard navigation, screen-reader support, ARIA, contrast, reduced motion, captions where possible; status never conveyed by colour alone |
| Security & privacy | RBAC, school isolation, safest-default visibility for minors, audit logging, access-controlled media, no exposure of private student data |
| Scale | Thousands of schools, millions of students, high media and feed volume |
| Observability | Structured logs, request ids, metrics, error tracking |

## 7. Success metrics

Activation (registration → first submission), weekly active Scholars, submissions per active
Scholar, **review coverage** (share of submissions receiving Preceptor feedback — the health
metric that distinguishes Ncanny from a generic social feed), feedback latency, 7/30-day
retention, subject-community participation, reported-content resolution time.

## 8. Explicit non-goals

- Not a replacement for a school LMS, gradebook or timetable system.
- Not an open social network: discovery is academic and school-aware, not global-stranger-based.
- Not engagement-maximising: no infinite-scroll dark patterns, no streak mechanics that punish
  absence, no ranking that rewards volume over quality.
- AI never acts as the authoritative grader.
