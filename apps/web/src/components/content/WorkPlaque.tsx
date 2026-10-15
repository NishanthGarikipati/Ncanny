import { ContentType, type WorkCard } from '@ncanny/types';
import Link from 'next/link';

const TONE: Record<string, string> = {
  [ContentType.ESSAY]: 'border-l-primary',
  [ContentType.PAINTING]: 'border-l-accent',
  [ContentType.ELOCUTION]: 'border-l-warning',
  [ContentType.STUDY_ACTIVITY]: 'border-l-success',
  [ContentType.TEACHER_PRESENTATION]: 'border-l-info',
  [ContentType.TEACHER_VIDEO]: 'border-l-info',
};

const LABEL: Record<string, string> = {
  [ContentType.ESSAY]: 'Essay',
  [ContentType.PAINTING]: 'Painting',
  [ContentType.ELOCUTION]: 'Elocution',
  [ContentType.STUDY_ACTIVITY]: 'Study activity',
  [ContentType.TEACHER_PRESENTATION]: 'Faculty notes',
  [ContentType.TEACHER_VIDEO]: 'Faculty audio',
};

/** A school work as a plaque you can open. The same card is used on every surface. */
export function WorkPlaque({ work }: { work: WorkCard }) {
  return (
    <Link
      href={`/work/${work.id}`}
      className={`flex h-full flex-col rounded-2xl border border-border border-l-4 bg-surface p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${TONE[work.type] ?? 'border-l-primary'}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="kicker">{LABEL[work.type] ?? work.type}</span>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-content-muted">
          {work.review ? `${work.review.score}/100` : 'Unmarked'}
        </span>
      </span>
      <span className="mt-2 font-display text-lg font-semibold text-content">{work.title}</span>
      <span className="mt-1 text-sm text-content-muted">
        {work.authorName} · {work.subjectName}
      </span>
      {work.summary && <span className="mt-2 line-clamp-2 text-sm text-content">{work.summary}</span>}
    </Link>
  );
}
