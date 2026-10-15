import type { AvatarPreset, BadgeKey } from '@ncanny/types';

/** Shared pieces of the neon console from the Ncanny reference screens. */

const PRESET_MARK: Record<AvatarPreset, string> = {
  crest: '◆',
  book: '▣',
  quill: '✎',
  lantern: '☾',
  compass: '✺',
};

export const AVATAR_PRESET_LABELS: Record<AvatarPreset, string> = {
  crest: 'Crest',
  book: 'Book',
  quill: 'Quill',
  lantern: 'Lantern',
  compass: 'Compass',
};

export function Portrait({
  name,
  src,
  preset,
  size = 'lg',
}: {
  name: string;
  src?: string;
  preset?: AvatarPreset;
  size?: 'lg' | 'md';
}) {
  const initial = name.trim().charAt(0).toUpperCase() || 'N';
  const mark = preset ? PRESET_MARK[preset] : null;
  return (
    <div className={`portrait portrait-${size}`} aria-hidden={src || mark ? undefined : true}>
      {src && !preset ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-label={preset ? `${AVATAR_PRESET_LABELS[preset]} avatar` : undefined}>{mark ?? initial}</span>
      )}
    </div>
  );
}

const BADGE_MARK: Record<BadgeKey, string> = {
  shield: '⛨',
  star: '★',
  medal: '✪',
};

export const BADGE_LABELS: Record<BadgeKey, string> = {
  shield: 'Shield',
  star: 'Star',
  medal: 'Medal',
};

export function BadgeMark({ badge }: { badge: BadgeKey }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/60 bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
      <span aria-hidden="true">{BADGE_MARK[badge]}</span>
      {BADGE_LABELS[badge]}
    </span>
  );
}

/** Five stars from a Preceptor mark. Empty when the work has not been marked. */
export function MarkStars({ score }: { score?: number }) {
  const filled = score == null ? 0 : Math.max(0, Math.min(5, Math.round(score / 20)));
  return (
    <span className="inline-flex gap-0.5 text-lg leading-none" aria-label={score == null ? 'Not marked yet' : `Marked ${score} out of 100`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className={index < filled ? 'star-on' : 'star-off'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}
