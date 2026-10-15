'use client';

import { GRADE_LABELS, type GradeLevel, type RosterMember, type SchoolRoster, type SchoolWorkCounts, type WorkCard } from '@ncanny/types';
import { Alert, EmptyState, LoadingState, TabPanel, Tabs } from '@ncanny/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WorkPlaque } from '../../../components/content/WorkPlaque';
import { getApiClient } from '../../../lib/api';

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'scholars', label: 'Scholars' },
  { id: 'preceptors', label: 'Preceptors' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'reports', label: 'Reports' },
];

export default function SchoolPage() {
  const [roster, setRoster] = useState<SchoolRoster | null>(null);
  const [counts, setCounts] = useState<SchoolWorkCounts | null>(null);
  const [works, setWorks] = useState<WorkCard[]>([]);
  const [tab, setTab] = useState('about');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const client = getApiClient();
    Promise.all([
      client.schools.roster({ signal: controller.signal }),
      client.content.summary({ signal: controller.signal }),
      client.content.feed({ limit: 24 }, { signal: controller.signal }),
    ])
      .then(([people, summary, feed]) => {
        setRoster(people);
        setCounts(summary);
        setWorks(feed.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not open your school.');
      });
    return () => controller.abort();
  }, []);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!roster || !counts) return <LoadingState label="Opening your school" />;

  const address = [
    roster.school.address.line1,
    roster.school.address.line2,
    roster.school.address.city,
    roster.school.address.state,
    roster.school.address.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <section className="hud-frame p-5">
        <p className="kicker">School</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-content">{roster.school.name}</h1>
        <p className="mt-2 text-sm text-content-muted">{address}</p>
        <p className="mt-1 text-xs text-content-muted">
          {roster.school.verified ? 'Verified school' : 'School record'} · {roster.school.scholarCount} scholars ·{' '}
          {roster.school.preceptorCount} preceptors
        </p>
      </section>

      <Tabs tone="pill" aria-label="School" activeId={tab} onChange={setTab} items={TABS} />

      <TabPanel id="about" activeId={tab}>
        <div className="rounded-2xl border border-primary/40 bg-surface-sunken p-4 text-sm text-content">
          <p>This page is your school. Classmates who keep a school-visible profile appear by name and Canny ID.</p>
          <p className="mt-2 text-content-muted">Email, phone and home address are not shown here.</p>
        </div>
      </TabPanel>

      <TabPanel id="scholars" activeId={tab}>
        <RosterList
          people={roster.scholars}
          empty="No scholars are visible yet"
          detail="School-visible scholar profiles appear here by name and Canny ID."
        />
      </TabPanel>

      <TabPanel id="preceptors" activeId={tab}>
        <RosterList
          people={roster.preceptors}
          empty="No preceptors are visible yet"
          detail="School-visible preceptor profiles appear here by name and Canny ID."
        />
      </TabPanel>

      <TabPanel id="gallery" activeId={tab}>
        {works.length === 0 ? (
          <EmptyState title="The gallery is empty" description="Published school work hangs here." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {works.map((work) => (
              <li key={work.id}>
                <WorkPlaque work={work} />
              </li>
            ))}
          </ul>
        )}
      </TabPanel>

      <TabPanel id="reports" activeId={tab}>
        <ul className="grid gap-3 sm:grid-cols-2">
          <CountBar label="Paintings" value={counts.paintings} max={maxCount(counts)} />
          <CountBar label="Essays" value={counts.essays} max={maxCount(counts)} />
          <CountBar label="Elocution" value={counts.elocutions} max={maxCount(counts)} />
          <CountBar label="Study activities" value={counts.studyActivities} max={maxCount(counts)} />
          <CountBar label="Faculty" value={counts.faculty} max={maxCount(counts)} />
        </ul>
      </TabPanel>
    </div>
  );
}

function maxCount(counts: SchoolWorkCounts): number {
  return Math.max(1, counts.paintings, counts.essays, counts.elocutions, counts.studyActivities, counts.faculty);
}

function CountBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.round((value / max) * 100);
  return (
    <li className="rounded-2xl border border-primary/40 bg-surface p-3">
      <div className="flex justify-between text-sm">
        <span className="text-content">{label}</span>
        <span className="font-semibold text-content">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label={`${label}: ${value}`}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}

function RosterList({ people, empty, detail }: { people: RosterMember[]; empty: string; detail: string }) {
  if (people.length === 0) return <EmptyState title={empty} description={detail} />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {people.map((person) => (
        <li key={person.cannyId}>
          <Link
            href={`/profile/${person.cannyId}`}
            className="block rounded-2xl border-2 border-primary/60 bg-surface p-4 shadow-hud hover:border-accent"
          >
            <p className="font-semibold text-content">{person.fullName}</p>
            <p className="font-mono text-xs text-content-muted">{person.cannyId}</p>
            <p className="mt-2 text-sm text-content-muted">
              {person.grade ? GRADE_LABELS[person.grade as GradeLevel] : person.preceptorRole ?? 'Preceptor'}
              {person.section ? ` · Section ${person.section}` : ''} · Level {person.level}
            </p>
            <p className="text-sm text-content">
              {person.badgeCount} badge{person.badgeCount === 1 ? '' : 's'}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
