'use client';

import type { AcademicHall, WorkCard } from '@ncanny/types';
import { Alert, Button, Card, EmptyState, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { AcademicHall as Hall } from '../../world/AcademicHall';
import { detectWebGl } from '../../world/webgl';

export function Whiteboard() {
  const [works, setWorks] = useState<WorkCard[] | null>(null);
  const [hall, setHall] = useState<AcademicHall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [webgl, setWebgl] = useState<'webgl2' | 'webgl' | 'none' | 'unknown'>('unknown');

  useEffect(() => {
    setWebgl(detectWebGl());
    const controller = new AbortController();
    getApiClient()
      .content.feed({ limit: 24 }, { signal: controller.signal })
      .then((page) => setWorks(page.items))
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load the whiteboard.');
      });
    return () => controller.abort();
  }, []);

  const enterHall = async () => {
    try {
      setHall(await getApiClient().whiteboard.hall());
      setMode('3d');
    } catch {
      setError('Could not open the hall.');
    }
  };

  const setPresence = async (optedIn: boolean) => {
    const result = await getApiClient().whiteboard.setPresence({ optedIn });
    const next = await getApiClient().whiteboard.hall();
    setHall({ ...next, viewerOptedIn: result.optedIn });
  };

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!works) return <LoadingState label="Loading the whiteboard" />;

  if (mode === '3d' && hall) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={hall.viewerOptedIn ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => void setPresence(!hall.viewerOptedIn)}
          >
            {hall.viewerOptedIn ? 'Leave the hall quietly' : 'Appear in the hall'}
          </Button>
          <p className="text-sm text-content-muted">
            Appearing shows your name and Canny ID to your school. There is no chat.
          </p>
        </div>
        <Hall works={hall.works} presence={hall.presence} onExit={() => setMode('2d')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-content-muted">
          Work from your school. The hall is the same wall, walked through.
        </p>
        {webgl === 'none' ? (
          <p className="text-sm text-content-muted">This device cannot draw the hall, so the whiteboard stays in 2D.</p>
        ) : (
          <Button onClick={() => void enterHall()}>Enter the 3D hall</Button>
        )}
      </div>

      {works.length === 0 ? (
        <EmptyState
          title="The whiteboard is empty"
          description="Publish an essay, painting, elocution or study activity and it will hang here for your school."
          action={
            <Link
              href="/create"
              className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
            >
              Create work
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {works.map((work) => (
            <li key={work.id}>
              <Link href={`/work/${work.id}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Card className="h-full">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {work.type.replaceAll('_', ' ')}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-content">{work.title}</h2>
                  <p className="mt-1 text-sm text-content-muted">
                    {work.authorName} · {work.subjectName}
                  </p>
                  {work.review && (
                    <p className="mt-2 text-sm text-content">Marked {work.review.score}/100</p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
