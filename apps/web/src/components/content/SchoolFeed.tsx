'use client';

import type { WorkCard } from '@ncanny/types';
import { Alert, Card, CardHeader, EmptyState, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { WorkPlaque } from './WorkPlaque';

export function SchoolFeed({ isScholar, profileHref }: { isScholar: boolean; profileHref: string }) {
  const [works, setWorks] = useState<WorkCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .content.feed({ limit: 6 }, { signal: controller.signal })
      .then((page) => setWorks(page.items))
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load work from your school.');
      });
    return () => controller.abort();
  }, []);

  return (
    <Card>
      <CardHeader
        title="School board"
        description="Newest work from your school. The campus is where you play with it."
        action={
          <Link href="/explore" className="text-sm font-medium text-primary">
            Open campus
          </Link>
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {!works && !error && <LoadingState label="Loading school work" />}
      {works && works.length === 0 && (
        <EmptyState
          title="Nothing published yet"
          description={
            isScholar
              ? 'Publish an essay, painting, elocution or study activity and it will appear here for your school.'
              : 'Scholar work from your school will appear here. You can also publish teaching notes.'
          }
          action={
            <Link
              href="/create"
              className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Create work
            </Link>
          }
        />
      )}
      {works && works.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {works.map((work) => (
            <li key={work.id}>
              <WorkPlaque work={work} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-content-muted">
        <Link href={profileHref} className="font-medium text-primary">
          Open your character sheet
        </Link>
      </p>
    </Card>
  );
}
