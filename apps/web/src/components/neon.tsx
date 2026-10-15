/** Shared pieces of the neon console from the Ncanny reference screens. */

export function Portrait({
  name,
  src,
  size = 'lg',
}: {
  name: string;
  src?: string;
  size?: 'lg' | 'md';
}) {
  const initial = name.trim().charAt(0).toUpperCase() || 'N';
  return (
    <div className={`portrait portrait-${size}`} aria-hidden={src ? undefined : true}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
    </div>
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
