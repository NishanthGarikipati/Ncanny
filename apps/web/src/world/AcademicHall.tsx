'use client';

import type { HallPresence, WorkCard, WorkDetail } from '@ncanny/types';
import { Button, LoadingState } from '@ncanny/ui';
import { useEffect, useRef, useState } from 'react';
import { getApiClient } from '../lib/api';
import { WorkReader } from '../components/content/WorkReader';

interface AcademicHallProps {
  works: WorkCard[];
  presence: HallPresence[];
  onExit: () => void;
}

/**
 * The hall is loaded only when this component mounts. Leaving 3D unmounts it
 * and drops the Three.js bundle from the live page.
 */
export function AcademicHall({ works, presence, onExit }: AcademicHallProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<WorkDetail | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;
    let dispose = () => {};
    let cancelled = false;

    void import('./hall-scene').then((module) => {
      if (cancelled || !mountRef.current) return;
      dispose = module.mountHall(mountRef.current, {
        works,
        presence,
        reducedMotion,
        onOpen: (workId) => {
          void getApiClient()
            .content.byId(workId)
            .then(setOpen)
            .catch(() => setOpen(null));
        },
      });
      setReady(true);
    });

    return () => {
      cancelled = true;
      dispose();
    };
  }, [works, presence, reducedMotion]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-[#0a0f1c]">
      <div ref={mountRef} className="h-[70vh] w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingState label="Opening the hall" />
        </div>
      )}
      <div className="absolute left-3 top-3 flex max-w-sm flex-col gap-2">
        <p className="rounded-md bg-black/60 px-3 py-2 text-sm text-white">
          {reducedMotion
            ? 'Drag to look. Click a panel to open the work.'
            : 'Click the hall, then use W A S D to walk. Click a panel to open it. Esc releases the mouse.'}
        </p>
        <Button variant="secondary" size="sm" onClick={onExit}>
          Back to the whiteboard
        </Button>
      </div>
      {open && (
        <div className="absolute inset-x-3 bottom-3 max-h-[45%] overflow-y-auto rounded-lg bg-surface p-4 shadow-level-3">
          <WorkReader work={open} onClose={() => setOpen(null)} />
        </div>
      )}
    </div>
  );
}
