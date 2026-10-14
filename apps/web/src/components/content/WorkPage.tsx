'use client';

import type { WorkDetail } from '@ncanny/types';
import { Alert, Card, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { WorkReader } from './WorkReader';

export function WorkPage({ id }: { id: string }) {
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .content.byId(id, { signal: controller.signal })
      .then(setWork)
      .catch(() => {
        if (!controller.signal.aborted) setError('This work is not available.');
      });
    return () => controller.abort();
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Alert tone="danger">{error}</Alert>
        <Link href="/explore" className="text-sm font-medium text-primary">
          Back to the whiteboard
        </Link>
      </div>
    );
  }

  if (!work) {
    return <LoadingState label="Opening the work" />;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/explore" className="text-sm font-medium text-primary">
        Back to the whiteboard
      </Link>
      <Card>
        <WorkReader work={work} />
      </Card>
    </div>
  );
}
