'use client';

import { ContentType, UserRole, type AcademicHall, type HallPresence } from '@ncanny/types';
import { Alert, Button, EmptyState, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { WorkPlaque } from './WorkPlaque';

const FILTERS = [
  { id: 'all', label: 'All work', type: null },
  { id: 'essays', label: 'Essays', type: ContentType.ESSAY },
  { id: 'paintings', label: 'Paintings', type: ContentType.PAINTING },
  { id: 'elocution', label: 'Elocution', type: ContentType.ELOCUTION },
  { id: 'study', label: 'Study activities', type: ContentType.STUDY_ACTIVITY },
  { id: 'faculty', label: 'Faculty', type: ContentType.TEACHER_PRESENTATION },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

/**
 * The whiteboard. Filters show the same school works. Cards open the reader.
 * Classmates are name tokens on the floor. There is no chat.
 */
export function Campus() {
  const [hall, setHall] = useState<AcademicHall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .whiteboard.hall({ signal: controller.signal })
      .then(setHall)
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not open the whiteboard.');
      });
    return () => controller.abort();
  }, []);

  const active = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
  const works = useMemo(() => {
    if (!hall) return [];
    if (!active.type) return hall.works;
    if (active.id === 'faculty') {
      return hall.works.filter(
        (work) => work.type === ContentType.TEACHER_PRESENTATION || work.type === ContentType.TEACHER_VIDEO,
      );
    }
    return hall.works.filter((work) => work.type === active.type);
  }, [active, hall]);

  const setPresence = async (optedIn: boolean) => {
    const result = await getApiClient().whiteboard.setPresence({ optedIn });
    const next = await getApiClient().whiteboard.hall();
    setHall({ ...next, viewerOptedIn: result.optedIn });
  };

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!hall) return <LoadingState label="Opening the whiteboard" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="neon-title text-xl sm:text-2xl">Ncanny Whiteboard</h1>
        <Button variant={hall.viewerOptedIn ? 'secondary' : 'primary'} onClick={() => void setPresence(!hall.viewerOptedIn)}>
          {hall.viewerOptedIn ? 'Step off the floor' : 'Step onto the floor'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <section className="hall-floor flex min-h-[28rem] flex-col p-4 sm:p-5" aria-label="School work">
          <p className="text-sm text-content-muted">
            {hall.viewerOptedIn
              ? 'You are on the floor. Classmates see your name and Canny ID. There is no chat.'
              : 'Pick a card to read it. Step onto the floor to be seen by your school.'}
          </p>
          {works.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="This board is quiet"
                description="Publish a piece for your school and it hangs here for everyone there."
                action={
                  <Link href="/create" className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-contrast">
                    Create work
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 grid flex-1 content-start gap-3 sm:grid-cols-2">
              {works.map((work) => (
                <li key={work.id}>
                  <WorkPlaque work={work} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 rounded-full border border-primary/50 bg-surface/70 px-3 py-3">
            <p className="kicker px-2">On the floor</p>
            {hall.presence.length === 0 ? (
              <p className="px-2 pt-2 text-sm text-content-muted">No one else is here yet.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {hall.presence.map((person) => (
                  <Classmate key={person.cannyId} person={person} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="hud-frame flex flex-col gap-2 p-3" aria-label="Board filters">
          <p className="kicker px-2 pt-1">Board</p>
          <div role="tablist" aria-label="Work types" className="flex flex-col gap-2">
            {FILTERS.map((item) => {
              const count =
                !item.type
                  ? hall.works.length
                  : item.id === 'faculty'
                    ? hall.works.filter(
                        (work) => work.type === ContentType.TEACHER_PRESENTATION || work.type === ContentType.TEACHER_VIDEO,
                      ).length
                    : hall.works.filter((work) => work.type === item.type).length;
              const selected = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(item.id)}
                  className={`flex min-h-11 items-center justify-between rounded-xl border-2 px-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selected
                      ? 'border-accent bg-accent text-white'
                      : 'border-primary/60 bg-surface-sunken text-content hover:border-primary'
                  }`}
                >
                  {item.label}
                  <span className={selected ? 'text-white/80' : 'text-content-muted'}>{count}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Classmate({ person }: { person: HallPresence }) {
  const initial = person.fullName.trim().charAt(0).toUpperCase();
  return (
    <li>
      <Link
        href={`/profile/${person.cannyId}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/50 bg-surface px-2 pr-3 text-sm text-content hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-bold ${
            person.role === UserRole.PRECEPTOR ? 'bg-accent text-white' : 'bg-primary text-primary-contrast'
          }`}
        >
          {initial}
        </span>
        <span>
          <span className="block font-semibold leading-tight">{person.fullName}</span>
          <span className="block font-mono text-[11px] text-content-muted">{person.cannyId}</span>
        </span>
      </Link>
    </li>
  );
}
