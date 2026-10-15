import { ContentType, type WorkCard } from '@ncanny/types';
import Link from 'next/link';
import { MarkStars } from '../neon';

const LABEL: Record<string, string> = {
  [ContentType.ESSAY]: 'Essay',
  [ContentType.PAINTING]: 'Painting',
  [ContentType.ELOCUTION]: 'Elocution',
  [ContentType.STUDY_ACTIVITY]: 'Study activity',
  [ContentType.TEACHER_PRESENTATION]: 'Faculty notes',
  [ContentType.TEACHER_VIDEO]: 'Faculty audio',
};

/** A hanging card on the whiteboard. Opening it uses the same reader everywhere. */
export function WorkPlaque({ work }: { work: WorkCard }) {
  return (
    <Link
      href={`/work/${work.id}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-primary/70 bg-surface shadow-hud hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex items-center justify-between bg-primary/15 px-3 py-2">
        <span className="kicker">{LABEL[work.type] ?? work.type}</span>
        <MarkStars score={work.review?.score} />
      </span>
      <span className="flex flex-1 flex-col p-3">
        <span className="font-display text-lg font-semibold text-content">{work.title}</span>
        <span className="mt-1 text-sm text-content-muted">
          {work.authorName} · {work.subjectName}
        </span>
        {work.summary && <span className="mt-2 line-clamp-2 text-sm text-content">{work.summary}</span>}
      </span>
    </Link>
  );
}
