'use client';

import type { WorkCard } from '@ncanny/types';
import { Alert, Card, EmptyState, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';

export function MyWork() {
  const [works, setWorks] = useState<WorkCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .content.mine({ signal: controller.signal })
      .then(setWorks)
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load your work.');
      });
    return () => controller.abort();
  }, []);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!works) return <LoadingState label="Loading your work" />;

  if (works.length === 0) {
    return (
      <EmptyState
        title="You have not published yet"
        description="Essays, paintings, elocutions and study activities you publish appear here, with any mark a Preceptor leaves."
        action={
          <Link
            href="/create"
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
          >
            Create work
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {works.map((work) => (
        <li key={work.id}>
          <Link href={`/work/${work.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {work.type.replaceAll('_', ' ')}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-content">{work.title}</h2>
              <p className="mt-1 text-sm text-content-muted">{work.subjectName}</p>
              {work.review ? (
                <p className="mt-2 text-sm text-content">Marked {work.review.score}/100</p>
              ) : (
                <p className="mt-2 text-sm text-content-muted">Waiting for a Preceptor</p>
              )}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
