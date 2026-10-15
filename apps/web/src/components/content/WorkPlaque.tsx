'use client';

import { ContentType, type WorkCard } from '@ncanny/types';
import Link from 'next/link';
import { MarkStars } from '../neon';
import { EngagementBar } from './EngagementBar';

const LABEL: Record<string, string> = {
  [ContentType.ESSAY]: 'Essay',
  [ContentType.PAINTING]: 'Painting',
  [ContentType.ELOCUTION]: 'Elocution',
  [ContentType.STUDY_ACTIVITY]: 'Study activity',
  [ContentType.TEACHER_PRESENTATION]: 'Faculty notes',
  [ContentType.TEACHER_VIDEO]: 'Faculty audio',
};

/** A hanging card on the whiteboard. The title opens the reader. Actions stay on the card. */
export function WorkPlaque({ work }: { work: WorkCard }) {
  const posted = new Date(work.createdAt).toLocaleDateString();
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-primary/70 bg-surface shadow-hud">
      <div className="flex items-center justify-between bg-primary/15 px-3 py-2">
        <span className="kicker">{LABEL[work.type] ?? work.type}</span>
        <MarkStars score={work.review?.score} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link
          href={`/work/${work.id}`}
          className="font-display text-lg font-semibold text-content hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {work.title}
        </Link>
        <p className="text-sm text-content-muted">
          {work.authorName} · {work.subjectName}
        </p>
        <p className="text-xs text-content-muted">{posted}</p>
        {work.summary && <p className="line-clamp-2 text-sm text-content">{work.summary}</p>}
        <EngagementBar work={work} />
        <Link href={`/work/${work.id}#comments`} className="text-sm font-semibold text-primary">
          Comments {work.engagement.commentCount}
        </Link>
      </div>
    </article>
  );
}
