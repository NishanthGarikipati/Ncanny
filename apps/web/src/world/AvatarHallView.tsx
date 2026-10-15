'use client';

import type { HallPresence, WorkCard } from '@ncanny/types';
import { useEffect, useRef, useState } from 'react';
import type { AvatarHallApi, AvatarIdentity, HallAction } from './avatar-hall';

/**
 * The walking hall. Three.js loads only after this view is on screen.
 * The flat board stays available when WebGL is missing.
 */
export function AvatarHallView({
  works,
  presence,
  viewer,
  selectedId,
  onAct,
}: {
  works: WorkCard[];
  presence: HallPresence[];
  viewer: AvatarIdentity;
  selectedId: string | null;
  onAct: (workId: string, action: HallAction) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AvatarHallApi | null>(null);
  const worksRef = useRef(works);
  const selectedRef = useRef(selectedId);
  const onActRef = useRef(onAct);
  const presenceRef = useRef(presence);
  const viewerRef = useRef(viewer);
  const [reducedMotion, setReducedMotion] = useState(false);
  worksRef.current = works;
  selectedRef.current = selectedId;
  onActRef.current = onAct;
  presenceRef.current = presence;
  viewerRef.current = viewer;
  const presenceKey = presence.map((person) => person.cannyId).join('|');

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;
    let cancelled = false;
    let api: AvatarHallApi | null = null;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    void import('./avatar-hall').then((module) => {
      if (cancelled || !mountRef.current) return;
      api = module.mountAvatarHall(mountRef.current, {
        works: worksRef.current,
        presence: presenceRef.current,
        viewer: viewerRef.current,
        reducedMotion: motion,
        selectedId: selectedRef.current,
        onAct: (workId, action) => onActRef.current(workId, action),
      });
      apiRef.current = api;
    });

    return () => {
      cancelled = true;
      api?.dispose();
      apiRef.current = null;
    };
  }, [presenceKey, viewer.cannyId, viewer.fullName, viewer.role]);

  useEffect(() => {
    apiRef.current?.setWorks(works);
  }, [works]);

  useEffect(() => {
    apiRef.current?.setSelected(selectedId);
  }, [selectedId]);

  const hold = (code: string, down: boolean) => {
    apiRef.current?.setHeld(code, down);
  };

  return (
    <div>
      <p className="mb-2 text-sm text-content-muted">
        {reducedMotion
          ? 'Walking is off. Click a hanging card to open the work.'
          : 'That figure is your avatar. W A S D moves, drag looks around, and a click opens like, comment, badge, or rank.'}
      </p>
      <div className="relative h-[70vh] min-h-[28rem] overflow-hidden rounded-2xl border-2 border-primary/70 bg-[#07111f]">
      <div ref={mountRef} className="h-full w-full" />
      {!reducedMotion && (
        <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1" aria-label="Move your avatar">
          <span />
          <MoveButton label="Forward" code="KeyW" onHold={hold} />
          <span />
          <MoveButton label="Left" code="KeyA" onHold={hold} />
          <MoveButton label="Back" code="KeyS" onHold={hold} />
          <MoveButton label="Right" code="KeyD" onHold={hold} />
        </div>
      )}
      </div>
    </div>
  );
}

function MoveButton({
  label,
  code,
  onHold,
}: {
  label: string;
  code: string;
  onHold: (code: string, down: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full border-2 border-primary bg-black/50 text-xs font-bold text-white"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onHold(code, true);
      }}
      onPointerUp={() => onHold(code, false)}
      onPointerCancel={() => onHold(code, false)}
    >
      {label.slice(0, 1)}
    </button>
  );
}
