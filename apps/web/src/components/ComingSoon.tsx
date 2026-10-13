'use client';

import { EmptyState } from '@ncanny/ui';

/**
 * Placeholder for a destination that exists in navigation but whose feature
 * ships in a later milestone. It names the milestone rather than implying the
 * feature is merely loading.
 */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState title={title} description={description} />
    </div>
  );
}
