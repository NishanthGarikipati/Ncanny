'use client';

import { ContentType, UserRole, type AcademicHall, type HallPresence } from '@ncanny/types';
import { Alert, Button, EmptyState, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getApiClient } from '../../lib/api';
import { WorkPlaque } from './WorkPlaque';

const STATIONS = [
  { id: 'library', label: 'Library', hint: 'Essays', type: ContentType.ESSAY, area: 'station-library' },
  { id: 'studio', label: 'Studio', hint: 'Paintings', type: ContentType.PAINTING, area: 'station-studio' },
  { id: 'stage', label: 'Stage', hint: 'Elocution', type: ContentType.ELOCUTION, area: 'station-stage' },
  { id: 'lab', label: 'Laboratory', hint: 'Study activities', type: ContentType.STUDY_ACTIVITY, area: 'station-laboratory' },
  { id: 'faculty', label: 'Faculty', hint: 'Preceptor notes', type: ContentType.TEACHER_PRESENTATION, area: 'station-faculty' },
] as const;

type StationId = (typeof STATIONS)[number]['id'] | 'quad';

/**
 * Interactive campus. Stations filter the same school works the feed uses.
 * Plaques open the reader. Classmates are name tokens. There is no chat.
 */
export function Campus() {
  const [hall, setHall] = useState<AcademicHall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [station, setStation] = useState<StationId>('quad');

  const refresh = () => {
    const controller = new AbortController();
    getApiClient()
      .whiteboard.hall({ signal: controller.signal })
      .then(setHall)
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not open the campus.');
      });
    return controller;
  };

  useEffect(() => {
    const controller = refresh();
    return () => controller.abort();
  }, []);

  const active = STATIONS.find((item) => item.id === station);
  const works = useMemo(() => {
    if (!hall) return [];
    if (!active) return hall.works;
    return hall.works.filter((work) => matchesStation(active.id, work.type));
  }, [active, hall]);

  const setPresence = async (optedIn: boolean) => {
    const result = await getApiClient().whiteboard.setPresence({ optedIn });
    const next = await getApiClient().whiteboard.hall();
    setHall({ ...next, viewerOptedIn: result.optedIn });
  };

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!hall) return <LoadingState label="Opening the campus" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Play</p>
          <h1 className="font-display text-3xl font-semibold text-content">Campus</h1>
          <p className="mt-1 max-w-xl text-sm text-content-muted">
            Choose a station and open a classmate’s work. Stepping onto the quad shows your name and
            Canny ID to your school. There is no chat.
          </p>
        </div>
        <Button
          variant={hall.viewerOptedIn ? 'secondary' : 'primary'}
          onClick={() => void setPresence(!hall.viewerOptedIn)}
        >
          {hall.viewerOptedIn ? 'Step off the quad' : 'Step onto the quad'}
        </Button>
      </div>

      <div className="campus-map" role="tablist" aria-label="Campus stations">
        <div className="station-quad hud-frame flex min-h-56 flex-col p-4 sm:p-5">
          <p className="kicker">Quad</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-content">Classmates</h2>
          <p className="mt-1 text-sm text-content-muted">
            {hall.viewerOptedIn
              ? 'You are on the quad. Classmates see your name and Canny ID.'
              : 'You are off the quad. Only people who opt in appear here.'}
          </p>
          <ul className="mt-4 flex flex-1 flex-wrap content-start gap-2" aria-label="Classmates on the quad">
            {hall.presence.length === 0 && (
              <li className="text-sm text-content-muted">No one else is here yet.</li>
            )}
            {hall.presence.map((person) => (
              <Classmate key={person.cannyId} person={person} />
            ))}
          </ul>
          <button
            type="button"
            role="tab"
            aria-selected={station === 'quad'}
            onClick={() => setStation('quad')}
            className={`mt-4 min-h-11 rounded-xl border px-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              station === 'quad' ? 'border-primary bg-primary-soft text-content' : 'border-border text-content-muted'
            }`}
          >
            All school work · {hall.works.length}
          </button>
        </div>

        {STATIONS.map((item) => {
          const count = hall.works.filter((work) => matchesStation(item.id, work.type)).length;
          const selected = station === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setStation(item.id)}
              className={`${item.area} flex min-h-28 flex-col justify-between rounded-2xl border px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected
                  ? 'border-primary bg-primary-soft text-content shadow-hud'
                  : 'border-border bg-surface-raised/80 text-content hover:border-primary/60'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <StationMark id={item.id} />
                <span className="font-mono text-xs text-content-muted">{count}</span>
              </span>
              <span>
                <span className="kicker">{item.hint}</span>
                <span className="mt-1 block font-display text-xl font-semibold">{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="hud-frame p-4 sm:p-5" aria-label={active ? active.label : 'Quad'}>
        <h2 className="font-display text-xl font-semibold text-content">{active ? active.label : 'Everything on the quad'}</h2>
        <p className="mt-1 text-sm text-content-muted">
          {active ? active.hint : 'Newest published work from your school.'}
        </p>
        {works.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="This station is quiet"
              description="Publish a piece for your school and it lands here for everyone there."
              action={
                <Link
                  href="/create"
                  className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
                >
                  Create work
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {works.map((work) => (
              <li key={work.id}>
                <WorkPlaque work={work} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function matchesStation(id: string, type: ContentType): boolean {
  if (id === 'faculty') return type === ContentType.TEACHER_PRESENTATION || type === ContentType.TEACHER_VIDEO;
  const station = STATIONS.find((item) => item.id === id);
  return station ? type === station.type : true;
}

function Classmate({ person }: { person: HallPresence }) {
  const initial = person.fullName.trim().charAt(0).toUpperCase();
  return (
    <li>
      <Link
        href={`/profile/${person.cannyId}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-2 pr-3 text-sm text-content hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 place-items-center rounded-full font-display text-sm font-semibold ${
            person.role === UserRole.PRECEPTOR ? 'bg-accent-soft text-accent' : 'bg-primary-soft text-primary'
          }`}
        >
          {initial}
        </span>
        <span>
          <span className="block font-medium leading-tight">{person.fullName}</span>
          <span className="block font-mono text-[11px] text-content-muted">{person.cannyId}</span>
        </span>
      </Link>
    </li>
  );
}

function StationMark({ id }: { id: string }) {
  const paths: Record<string, ReactNode> = {
    library: <path d="M5 5.5h10.5A2.5 2.5 0 0 1 18 8v11H7.5A2.5 2.5 0 0 0 5 16.5zM5 5.5V16" />,
    studio: (
      <>
        <circle cx="12" cy="12" r="7" />
        <circle cx="9" cy="11" r="1" fill="currentColor" />
        <circle cx="13" cy="9" r="1" fill="currentColor" />
        <circle cx="15" cy="13" r="1" fill="currentColor" />
      </>
    ),
    stage: <path d="M4 17V8l8-3 8 3v9M8 17v-4h8v4" />,
    lab: <path d="M9 3h6M10 3v6L6 19a2 2 0 0 0 1.8 3h8.4A2 2 0 0 0 18 19l-4-10V3" />,
    faculty: <path d="M3 10 12 5l9 5-9 5zM7 12v4c1.5 1 3.5 1.5 5 1.5s3.5-.5 5-1.5v-4" />,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      {paths[id]}
    </svg>
  );
}
