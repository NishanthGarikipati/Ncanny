# Ncanny — Game Design

## 1. Intent

Ncanny gamifies **academic participation and quality**, not time spent. Every mechanic is judged
against one question: *does this make a student learn, create or collaborate more meaningfully?*
If a mechanic only increases session length, it does not ship.

Explicitly rejected: daily-login rewards, loss-framed streak punishment, pay-to-win, raw-like
leaderboards, public shaming of low performers, infinite-scroll engagement traps.

## 2. Core loop

```
CREATE  →  SHARE  →  REVIEW  →  EARN  →  CONNECT  →  LEARN  →  CREATE
```

A worked example:

1. Scholar submits an essay → `content.created` → XP for completing a submission.
2. The item appears on the feed and Whiteboard for their school and subject.
3. A Preceptor reviews it: comment, marks, like, optionally a badge.
4. Review events award **quality XP**, weighted by the marks — this is deliberately the larger XP
   source, so effort is rewarded but quality is rewarded more.
5. Badge criteria are re-evaluated; any newly satisfied badge is awarded once.
6. Rank is recalculated from multiple signals.
7. Achievement is surfaced to the Scholar and (subject to visibility) to their school.

## 3. Systems

| System | Purpose | Notes |
| --- | --- | --- |
| **XP** | Measures academic participation and quality | Awarded for submissions, reviews received, review quality, helpful peer feedback, challenge participation. Per-day caps per source prevent farming |
| **Level** | Long-horizon progression | Monotonic, never decreases. Level never gates access to educational features — only to cosmetic and exploration rewards |
| **Badge** | Recognition of specific accomplishments | Configurable `criteria`; awarded once; Preceptor-awarded badges are distinguished from system-awarded ones |
| **Rank** | Comparative standing | Multi-signal (see §4), recomputed on a schedule, never in the hot path |
| **Achievement** | Milestones along a journey | Narrative-flavoured, e.g. "first essay", "ten peers helped" |
| **Streak** | Gentle consistency encouragement | Rewards presence, never punishes absence; no visible decay counters; holidays and weekends ignored |
| **Challenge** | Time-boxed academic events | Subject/grade scoped, with rules, evaluation criteria and rewards |
| **Quest** | Guided multi-step learning path | Post-MVP |
| **Leaderboard** | Social context for progress | Scoped to global / school / subject / grade / challenge; opt-out available |

## 4. Ranking model

Ranking is a weighted, configurable composite. Raw likes may never be the only factor.

```
rank_score =
    w_quality      * normalised_teacher_marks
  + w_review       * review_depth_and_count
  + w_engagement   * peer_engagement (likes, comments, saves — log-damped)
  + w_consistency  * sustained_participation
  + w_challenge    * challenge_performance
  + w_achievement  * achievements_and_badges
```

Weights live in configuration, not code. Peer engagement is log-damped so popularity cannot
dominate evaluated quality. Cross-grade comparison is normalised within grade bands, so younger
students are not ranked against older ones.

## 5. Economy guardrails

Per-source daily XP caps · diminishing returns on repeated identical actions · badges awarded once
· self-interaction excluded from every signal · reciprocal like-rings detectable and discountable ·
all awards audit-logged so anomalies can be investigated and reversed.

## 6. The campus layer

The shipped exploration face is the **campus board** (`DL-0018`): stations filter the same school
works, plaques open the reader, and opted-in classmates appear as name tokens. It introduces no
mechanic that the feed does not already have, and it does not require WebGL. A pointer-lock hall
is not part of navigation.

A later walkable scene, if it returns, stays an enhancement of this board. It introduces no
mechanic that does not exist in 2D.

- **Spaces.** A virtual academic hall whose walls carry the Whiteboard content, subject zones,
  achievement displays and (where enabled) other users' avatars.
- **Interaction.** Move, look, select, open an item, return to standard UI. Opening an item shows
  the same content component as 2D, inside a panel.
- **HUD.** Level, XP, notifications, current subject zone, and an always-available exit to 2D.
- **Presence.** Opt-in, school-scoped, with no free-form proximity chat.

### Device tiers

| Tier | Detection | Experience |
| --- | --- | --- |
| High | Desktop/high-end mobile, WebGL2, sufficient memory | Full scene, full lighting, presence |
| Medium | Mid-range mobile, WebGL2 | Reduced draw distance, simplified lighting, fewer avatars |
| Low / unsupported | No WebGL, low memory, or user preference | 2D Whiteboard — complete, not a degraded placeholder |

Detection runs once, is cached, and is always overridable by the user. Scenes and assets are
dynamically imported, so a user who never enters 3D never downloads it. `prefers-reduced-motion`
disables camera bob, idle animation and transition flourishes.

## 7. Safety inside the game layer

No unmoderated free-text in shared 3D space · presence limited to a user's school unless a
school-level setting opens it · report and block reachable from inside the 3D HUD · no mechanic
that rewards contacting strangers.
