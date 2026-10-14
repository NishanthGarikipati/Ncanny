'use client';

import type { WorkCard } from '@ncanny/types';
import { Alert, Card, CardHeader, EmptyState, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';

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
        title="Your school"
        description="Newest published work. The whiteboard holds the full wall."
        action={
          <Link href="/explore" className="text-sm font-medium text-primary">
            Open whiteboard
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
        <ul className="flex flex-col gap-3">
          {works.map((work) => (
            <li key={work.id}>
              <Link href={`/work/${work.id}`} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {work.type.replaceAll('_', ' ')}
                </p>
                <p className="font-medium text-content">{work.title}</p>
                <p className="text-sm text-content-muted">
                  {work.authorName} · {work.subjectName}
                  {work.review ? ` · ${work.review.score}/100` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-content-muted">
        <Link href={profileHref} className="font-medium text-primary">
          Your profile
        </Link>{' '}
        still holds your Canny ID and subjects.
      </p>
    </Card>
  );
}
