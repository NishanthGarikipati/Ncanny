'use client';

import { Button } from '@ncanny/ui';
import { useEffect, useRef, useState } from 'react';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Play, skip, volume and fullscreen around the recording itself. */
export function ElocutionStage({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(duration || audio.duration || 0, Math.max(0, audio.currentTime + delta));
    audio.currentTime = next;
    setTime(next);
  };

  const fullscreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen();
  };

  return (
    <div ref={stageRef} className="stage">
      <p className="kicker">Elocution</p>
      <p className="mt-2 font-display text-lg text-content">{title}</p>
      <audio ref={audioRef} src={src} preload="metadata" className="sr-only" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={toggle} aria-pressed={playing}>
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => skip(-10)}>
          Back 10s
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => skip(10)}>
          Skip 10s
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={fullscreen}>
          Full screen
        </Button>
      </div>
      <label className="mt-3 block text-xs text-content-muted">
        Timeline
        <input
          className="mt-1 w-full accent-primary"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (audioRef.current) audioRef.current.currentTime = next;
            setTime(next);
          }}
        />
        <span className="mt-1 block font-mono">
          {formatTime(time)} / {formatTime(duration)}
        </span>
      </label>
      <label className="mt-2 block text-xs text-content-muted">
        Volume
        <input
          className="mt-1 w-full max-w-xs accent-primary"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) => {
            const next = Number(event.target.value);
            setVolume(next);
            if (audioRef.current) audioRef.current.volume = next;
          }}
        />
      </label>
    </div>
  );
}
