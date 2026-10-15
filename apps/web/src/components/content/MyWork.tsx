'use client';

import type { WorkCard } from '@ncanny/types';
import { Alert, EmptyState, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { WorkPlaque } from './WorkPlaque';

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
    <ul className="grid gap-3">
      {works.map((work) => (
        <li key={work.id}>
          <WorkPlaque work={work} />
        </li>
      ))}
    </ul>
  );
}
