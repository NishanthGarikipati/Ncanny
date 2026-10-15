'use client';

import { ContentType, MediaKind, UserRole, type AcademicHall, type HallPresence, type WorkCard, type WorkDetail } from '@ncanny/types';
import { Alert, Button, EmptyState, FormField, LoadingState, Textarea } from '@ncanny/ui';
import { commentWorkSchema } from '@ncanny/validation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../lib/form';
import { BadgeMark, MarkStars } from '../neon';
import { ElocutionStage } from './ElocutionStage';
import { EngagementBar } from './EngagementBar';

const FILTERS = [
  { id: 'all', label: 'All work' },
  { id: 'videos', label: 'Videos' },
  { id: 'essays', label: 'Essays' },
  { id: 'comment', label: 'Comment' },
  { id: 'badge', label: 'Badge' },
  { id: 'rank', label: 'Rank' },
  { id: 'paintings', label: 'Paintings' },
  { id: 'elocution', label: 'Elocution' },
  { id: 'study', label: 'Study activities' },
  { id: 'likes', label: 'Likes' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const RAIL = FILTERS.filter((item) => item.id !== 'likes');

const LABEL: Record<string, string> = {
  [ContentType.ESSAY]: 'Essay',
  [ContentType.PAINTING]: 'Painting',
  [ContentType.ELOCUTION]: 'Elocution',
  [ContentType.STUDY_ACTIVITY]: 'Study activity',
  [ContentType.TEACHER_PRESENTATION]: 'Faculty notes',
  [ContentType.TEACHER_VIDEO]: 'Faculty audio',
};

/**
 * The blackboard. Cards hang in the hall and the like, comment, badge and rank
 * controls call the API. Classmates on the ring are names and Canny IDs. There is no chat.
 */
export function Campus() {
  const viewer = useAuthStore((state) => state.user);
  const [hall, setHall] = useState<AcademicHall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .whiteboard.hall({ signal: controller.signal })
      .then(setHall)
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not open the blackboard.');
      });
    return () => controller.abort();
  }, []);

  const works = useMemo(() => {
    if (!hall) return [];
    return hall.works.filter((work) => matchesFilter(filter, work));
  }, [filter, hall]);

  useEffect(() => {
    if (selectedId && !works.some((work) => work.id === selectedId)) {
      setSelectedId(null);
      setDetail(null);
    }
  }, [selectedId, works]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const controller = new AbortController();
    setDetailError(null);
    getApiClient()
      .content.byId(selectedId, { signal: controller.signal })
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setDetailError('Could not open that piece.');
      });
    return () => controller.abort();
  }, [selectedId]);

  const applyDetail = (next: WorkDetail) => {
    setDetail(next);
    setHall((current) => {
      if (!current) return current;
      return {
        ...current,
        works: current.works.map((work) =>
          work.id === next.id ? { ...work, engagement: next.engagement, review: next.review } : work,
        ),
      };
    });
  };

  const setPresence = async (optedIn: boolean) => {
    const result = await getApiClient().whiteboard.setPresence({ optedIn });
    const next = await getApiClient().whiteboard.hall();
    setHall({ ...next, viewerOptedIn: result.optedIn });
  };

  const openPiece = (id: string) => {
    if (id !== selectedId) {
      setDetail(null);
      setSelectedId(id);
    }
    window.requestAnimationFrame(() => {
      document.getElementById('board-dock')?.scrollIntoView({ block: 'nearest' });
    });
  };

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!hall || !viewer) return <LoadingState label="Opening the blackboard" />;

  const likes = hall.works.reduce((sum, work) => sum + work.engagement.likeCount, 0);
  const comments = hall.works.reduce((sum, work) => sum + work.engagement.commentCount, 0);
  const badges = hall.works.reduce((sum, work) => sum + work.engagement.badges.length, 0);
  const ranks = hall.works.filter((work) => work.review != null).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="board-room">
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-4">
          <h1 className="neon-title text-lg sm:text-2xl">Ncanny Whiteboard/Blackboard</h1>
          <Button variant={hall.viewerOptedIn ? 'secondary' : 'primary'} onClick={() => void setPresence(!hall.viewerOptedIn)}>
            {hall.viewerOptedIn ? 'Step off the floor' : 'Step onto the floor'}
          </Button>
        </div>
        <div className="relative flex flex-wrap gap-2 px-4 pb-2" aria-label="Board totals">
          <HeaderChip label="likes" count={likes} pressed={filter === 'likes'} onClick={() => setFilter('likes')} />
          <HeaderChip label="comments" count={comments} pressed={filter === 'comment'} onClick={() => setFilter('comment')} />
          <HeaderChip label="badges" count={badges} pressed={filter === 'badge'} onClick={() => setFilter('badge')} />
          <HeaderChip label="ranks" count={ranks} pressed={filter === 'rank'} onClick={() => setFilter('rank')} />
        </div>

        <div className="relative grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_14.5rem]">
          <div>
            <section className="board-screen" aria-label="Hanging school work">
              {works.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="This board is quiet"
                    description="Publish a piece for your school and it hangs here. Filters only hide cards; they do not delete work."
                    action={
                      <Link href="/create" className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-contrast">
                        Create work
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ul className="grid gap-4 p-3 sm:grid-cols-2">
                  {works.map((work) => (
                    <li key={work.id}>
                      <BoardCard
                        work={work}
                        selected={work.id === selectedId}
                        onOpen={() => openPiece(work.id)}
                        onUpdated={applyDetail}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="board-floor" aria-label="On the floor">
              <div className="board-ring" aria-hidden="true" />
              <ul className="absolute inset-0">
                {hall.viewerOptedIn && (
                  <Figure
                    name="You"
                    cannyId={viewer.cannyId ?? ''}
                    role={viewer.role}
                    href={viewer.cannyId ? `/profile/${viewer.cannyId}` : '/profile'}
                    left="50%"
                  />
                )}
                {hall.presence.map((person, index) => (
                  <Figure
                    key={person.cannyId}
                    name={person.fullName}
                    cannyId={person.cannyId}
                    role={person.role}
                    href={`/profile/${person.cannyId}`}
                    left={floorLeft(index, hall.presence.length, hall.viewerOptedIn)}
                  />
                ))}
              </ul>
              {hall.presence.length === 0 && !hall.viewerOptedIn && (
                <p className="absolute inset-x-0 bottom-3 text-center text-sm text-content-muted">
                  Step onto the floor to be seen by your school. There is no chat.
                </p>
              )}
            </div>
          </div>

          <aside className="hud-frame flex flex-col gap-2 p-3" aria-label="Board filters">
            <p className="kicker px-2 pt-1">Board</p>
            <div role="tablist" aria-label="Work on the blackboard" className="flex flex-col gap-2">
              {RAIL.map((item) => {
                const count = hall.works.filter((work) => matchesFilter(item.id, work)).length;
                const selected = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setFilter(item.id)}
                    className={`flex min-h-11 items-center justify-between rounded-xl border-2 px-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${railClass(item.id, selected)}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FilterGlyph id={item.id} />
                      {item.label}
                    </span>
                    <span className={selected ? 'opacity-80' : 'text-content-muted'}>{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      <section id="board-dock" aria-label="Selected work" className="hud-frame p-4">
        {!selectedId && (
          <p className="text-sm text-content-muted">
            Choose Like, Comment, Badge or Rank on a card. The piece opens here, and the same actions are saved for your school.
          </p>
        )}
        {selectedId && detailError && <Alert tone="danger">{detailError}</Alert>}
        {selectedId && !detail && !detailError && <LoadingState label="Opening this piece" />}
        {detail && <BoardDock detail={detail} onUpdated={applyDetail} />}
      </section>
    </div>
  );
}

function BoardCard({
  work,
  selected,
  onOpen,
  onUpdated,
}: {
  work: WorkCard;
  selected: boolean;
  onOpen: () => void;
  onUpdated: (detail: WorkDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const engagement = work.engagement;

  const like = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      onUpdated(await getApiClient().content.react(work.id, { kind: 'like' }));
      if (!selected) onOpen();
    } catch {
      setActionError('Could not save that like.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="board-card" data-selected={selected}>
      <div className="flex items-center justify-between gap-2">
        <span className="kicker">{LABEL[work.type] ?? work.type}</span>
        <MarkStars score={work.review?.score} />
      </div>
      <CardArt work={work} />
      <Link
        href={`/work/${work.id}`}
        className="font-display text-lg font-semibold leading-tight text-content hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {work.title}
      </Link>
      <p className="text-sm text-content-muted">
        <Link href={`/profile/${work.authorCannyId}`} className="font-semibold text-content hover:text-primary">
          {work.authorName}
        </Link>
        <span> · {work.subjectName}</span>
      </p>
      {work.summary && <p className="line-clamp-2 text-sm text-content">{work.summary}</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <button type="button" className="board-orb" aria-pressed={engagement.viewerLiked} disabled={busy} onClick={() => void like()}>
          Like {engagement.likeCount}
        </button>
        <button type="button" className="board-orb" data-tone="comment" aria-pressed={selected} onClick={onOpen}>
          Comment {engagement.commentCount}
        </button>
        <button type="button" className="board-orb" aria-pressed={engagement.badges.length > 0} onClick={onOpen}>
          Badge {engagement.badges.length}
        </button>
        <button type="button" className="board-orb" aria-pressed={work.review != null} onClick={onOpen}>
          {work.review ? `Rank ${work.review.score}` : 'Rank'}
        </button>
      </div>
      {actionError && <p className="text-sm text-danger">{actionError}</p>}
    </article>
  );
}

function BoardDock({ detail, onUpdated }: { detail: WorkDetail; onUpdated: (detail: WorkDetail) => void }) {
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    setComment('');
    setErrors({});
  }, [detail.id]);

  useEffect(() => {
    if (!detail.hasMedia) return undefined;
    const controller = new AbortController();
    let url: string | null = null;
    getApiClient()
      .content.media(detail.id, { signal: controller.signal })
      .then((payload) => {
        const bytes = Uint8Array.from(atob(payload.dataBase64), (char) => char.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: payload.mimeType }));
        setMediaUrl(url);
      })
      .catch(() => setMediaUrl(null));
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [detail.hasMedia, detail.id]);

  const submitComment = async () => {
    const parsed = parseForm(commentWorkSchema, { body: comment });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    try {
      onUpdated(await getApiClient().content.comment(detail.id, parsed.data));
      setComment('');
      setErrors({});
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">{LABEL[detail.type] ?? detail.type}</p>
          <h2 className="font-display text-2xl font-semibold text-content">{detail.title}</h2>
          <p className="text-sm text-content-muted">
            {detail.authorName} · {detail.authorCannyId} · {detail.subjectName}
          </p>
        </div>
        <MarkStars score={detail.review?.score} />
      </div>

      {mediaUrl && detail.mediaKind === MediaKind.IMAGE && (
        <img src={mediaUrl} alt="" className="max-h-72 w-full rounded-xl object-contain" />
      )}
      {mediaUrl && detail.mediaKind === MediaKind.AUDIO && <ElocutionStage src={mediaUrl} title={detail.title} />}
      {detail.body && <p className="reading-well whitespace-pre-wrap">{detail.body}</p>}

      <EngagementBar work={detail} ownedByViewer={detail.ownedByViewer} onUpdated={onUpdated} />

      {detail.engagement.badges.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {detail.engagement.badges.map((badge) => (
            <li key={badge.key}>
              <BadgeMark badge={badge.key} />
              <span className="ml-1 text-xs text-content-muted">
                {badge.awardedByName} · {badge.awardedByCannyId}
              </span>
            </li>
          ))}
        </ul>
      )}

      {detail.review ? (
        <p className="text-sm text-content">
          Rank {detail.review.score}/100 from {detail.review.reviewerName}. {detail.review.feedback}
        </p>
      ) : (
        <p className="text-sm text-content-muted">No rank yet. A Preceptor marks this by hand.</p>
      )}

      <div>
        <h3 className="font-display text-lg font-semibold text-content">Comments</h3>
        {detail.comments.length === 0 ? (
          <p className="mt-1 text-sm text-content-muted">No comments on this piece yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {detail.comments.map((note) => (
              <li key={note.id} className="rounded-xl border border-border bg-surface-sunken px-3 py-2">
                <p className="text-sm font-semibold text-content">
                  {note.authorName} <span className="font-mono text-xs text-content-muted">{note.authorCannyId}</span>
                </p>
                <p className="text-sm text-content">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitComment();
        }}
      >
        <FormField label="Comment on this piece" error={errors.body}>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              name="body"
              value={comment}
              maxLength={500}
              aria-describedby={describedBy}
              invalid={invalid}
              onChange={(event) => setComment(event.target.value)}
            />
          )}
        </FormField>
        {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Post comment</Button>
          <Link href={`/work/${detail.id}`} className="inline-flex h-11 items-center rounded-full border-2 border-primary px-4 text-sm font-semibold text-primary">
            Open the full piece
          </Link>
        </div>
      </form>
    </div>
  );
}

function CardArt({ work }: { work: WorkCard }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!work.hasMedia || work.mediaKind !== MediaKind.IMAGE) return undefined;
    const controller = new AbortController();
    let url: string | null = null;
    getApiClient()
      .content.media(work.id, { signal: controller.signal })
      .then((payload) => {
        const bytes = Uint8Array.from(atob(payload.dataBase64), (char) => char.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: payload.mimeType }));
        setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [work.hasMedia, work.id, work.mediaKind]);

  return (
    <div className="board-art" aria-hidden="true">
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span className="font-display text-sm font-semibold text-primary">{LABEL[work.type] ?? 'Work'}</span>
      )}
    </div>
  );
}

function Figure({
  name,
  cannyId,
  role,
  href,
  left,
}: {
  name: string;
  cannyId: string;
  role: HallPresence['role'];
  href: string;
  left: string;
}) {
  return (
    <li className="board-figure" data-role={role === UserRole.PRECEPTOR ? 'preceptor' : 'scholar'} style={{ left }}>
      <Link href={href} className="flex flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="board-person" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="mt-1 max-w-full truncate text-xs font-semibold text-content">{name}</span>
        {cannyId && <span className="max-w-full truncate font-mono text-[10px] text-content-muted">{cannyId}</span>}
      </Link>
    </li>
  );
}

function HeaderChip({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="board-orb" aria-pressed={pressed} onClick={onClick}>
      {label} {count}
    </button>
  );
}

function FilterGlyph({ id }: { id: FilterId }) {
  const path: Record<FilterId, string> = {
    all: 'M4 6h16M4 12h16M4 18h16',
    videos: 'M8 6v12l10-6z',
    essays: 'M6 4h9l3 3v13H6z',
    comment: 'M5 6h14v9H8l-3 3z',
    badge: 'M12 3l2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.6z',
    rank: 'M8 4h8v3a4 4 0 0 1-8 0zM7 19h10M9 14v5M15 14v5',
    paintings: 'M4 6h16v12H4zM8 14l2.5-3 2 2.2L16 9l4 5',
    elocution: 'M12 4a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM7 11a5 5 0 0 0 10 0M12 16v4',
    study: 'M5 5h14v14H5zM8 9h8M8 13h5',
    likes: 'M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z',
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={path[id]} />
    </svg>
  );
}

function railClass(id: FilterId, selected: boolean): string {
  if (!selected) return 'border-primary/60 bg-surface-sunken text-content hover:border-primary';
  if (id === 'comment') return 'border-accent bg-accent text-white';
  if (id === 'badge') return 'border-primary bg-primary text-primary-contrast';
  return 'border-primary bg-primary-soft text-primary';
}

function matchesFilter(filter: FilterId, work: WorkCard): boolean {
  if (filter === 'all') return true;
  if (filter === 'videos') {
    return work.type === ContentType.ELOCUTION || work.type === ContentType.TEACHER_VIDEO || work.mediaKind === MediaKind.VIDEO;
  }
  if (filter === 'essays') return work.type === ContentType.ESSAY;
  if (filter === 'paintings') return work.type === ContentType.PAINTING;
  if (filter === 'elocution') return work.type === ContentType.ELOCUTION;
  if (filter === 'study') return work.type === ContentType.STUDY_ACTIVITY;
  if (filter === 'comment') return work.engagement.commentCount > 0;
  if (filter === 'badge') return work.engagement.badges.length > 0;
  if (filter === 'likes') return work.engagement.likeCount > 0;
  return work.review != null;
}

function floorLeft(index: number, count: number, viewerOnFloor: boolean): string {
  const slots = count + (viewerOnFloor ? 1 : 0);
  const place = viewerOnFloor ? index + 1 : index;
  if (slots === 1) return '50%';
  const start = 18;
  const end = 82;
  return `${start + ((end - start) * place) / (slots - 1)}%`;
}
