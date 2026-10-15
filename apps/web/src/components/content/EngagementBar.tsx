'use client';

import { BadgeKey, UserRole, type WorkCard, type WorkDetail } from '@ncanny/types';
import { Button } from '@ncanny/ui';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { BadgeMark } from '../neon';

/**
 * Like, smile, bookmark and Preceptor badges.
 * Each control calls the API. Counts come back from the server.
 */
export function EngagementBar({
  work,
  ownedByViewer = false,
  onUpdated,
}: {
  work: WorkCard;
  ownedByViewer?: boolean;
  onUpdated?: (detail: WorkDetail) => void;
}) {
  const viewer = useAuthStore((state) => state.user);
  const [engagement, setEngagement] = useState(work.engagement);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEngagement(work.engagement);
  }, [work]);

  const apply = (detail: WorkDetail) => {
    setEngagement(detail.engagement);
    onUpdated?.(detail);
  };

  const run = async (action: () => Promise<WorkDetail>) => {
    if (busy) return;
    setBusy(true);
    try {
      apply(await action());
    } finally {
      setBusy(false);
    }
  };

  const canAward = viewer?.role === UserRole.PRECEPTOR && !ownedByViewer;
  const awarded = new Set(engagement.badges.map((badge) => badge.key));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-pressed={engagement.viewerLiked}
          disabled={busy}
          onClick={() => void run(() => getApiClient().content.react(work.id, { kind: 'like' }))}
        >
          Like {engagement.likeCount}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-pressed={engagement.viewerSmiled}
          disabled={busy}
          onClick={() => void run(() => getApiClient().content.react(work.id, { kind: 'smile' }))}
        >
          Smiley {engagement.smileCount}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-pressed={engagement.bookmarked}
          disabled={busy}
          onClick={() => void run(() => getApiClient().content.bookmark(work.id))}
        >
          {engagement.bookmarked ? 'Saved' : 'Save'}
        </Button>
      </div>
      {(engagement.badges.length > 0 || canAward) && (
        <div className="flex flex-wrap items-center gap-2">
          {engagement.badges.map((badge) => (
            <BadgeMark key={badge.key} badge={badge.key} />
          ))}
          {canAward &&
            [BadgeKey.SHIELD, BadgeKey.STAR, BadgeKey.MEDAL]
              .filter((key) => !awarded.has(key))
              .map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void run(() => getApiClient().content.awardBadge(work.id, { key }))}
                >
                  Award {key}
                </Button>
              ))}
        </div>
      )}
    </div>
  );
}
