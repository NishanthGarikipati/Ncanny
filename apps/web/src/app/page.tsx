import { Card } from '@ncanny/ui';
import Link from 'next/link';
import { ThemeToggle } from '../components/ThemeToggle';

const LOOP = [
  { step: 'Learn', detail: 'Follow subjects, explore topics and pick up what your school is teaching.' },
  { step: 'Create', detail: 'Turn what you learn into paintings, essays, elocutions and study activities.' },
  { step: 'Play', detail: 'Take on challenges that reward understanding rather than speed alone.' },
  { step: 'Share', detail: 'Publish to your school, your connections, or keep it to yourself.' },
  { step: 'Review', detail: 'Preceptors mark your work and leave feedback you can act on.' },
  { step: 'Earn', detail: 'Collect XP, badges and levels for work that was genuinely good.' },
  { step: 'Connect', detail: 'Find Scholars and Preceptors who care about the same subjects.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="font-display text-xl font-semibold tracking-tight text-content">
          Ncanny
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/attendance"
            className="inline-flex h-11 items-center rounded-md px-4 text-sm font-medium text-content hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Join Ncanny
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <section className="py-12 sm:py-20">
          <p className="font-medium text-primary">Academic social platform</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-content sm:text-5xl">
            Where school work becomes something worth sharing.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-content-muted">
            Ncanny gives every Scholar a permanent academic identity, a place to publish real work,
            and Preceptors who review it properly. Built for schools, safe by default.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-base font-medium text-primary-contrast hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Create your Canny ID
            </Link>
            <Link
              href="/attendance"
              className="inline-flex h-12 items-center rounded-md border border-border px-6 text-base font-medium text-content hover:border-border-strong hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Mark attendance
            </Link>
          </div>
        </section>

        <section aria-labelledby="loop-heading" className="py-6">
          <h2 id="loop-heading" className="font-display text-2xl font-semibold text-content">
            The Ncanny loop
          </h2>
          <p className="mt-2 max-w-2xl text-content-muted">
            Every part of the platform feeds the next one.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((entry, index) => (
              <li key={entry.step}>
                <Card className="h-full">
                  <p className="text-sm font-semibold text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-content">
                    {entry.step}
                  </h3>
                  <p className="mt-1 text-sm text-content-muted">{entry.detail}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-content-muted sm:px-6">
          <p>Ncanny — academic social media and learning gaming platform.</p>
          <p>Student work is private by default.</p>
        </div>
      </footer>
    </div>
  );
}
