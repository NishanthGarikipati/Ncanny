'use client';

import type { Subject } from '@ncanny/types';
import { cn } from '@ncanny/ui';

interface SubjectPickerProps {
  subjects: Subject[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Labels the group for assistive technology. */
  legend: string;
  hint?: string;
  error?: string;
  id: string;
}

/** Multi-select rendered as checkboxes: no custom widget, no ARIA to get wrong. */
export function SubjectPicker({
  subjects,
  selected,
  onChange,
  legend,
  hint,
  error,
  id,
}: SubjectPickerProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const toggle = (subjectId: string) => {
    onChange(
      selected.includes(subjectId)
        ? selected.filter((value) => value !== subjectId)
        : [...selected, subjectId],
    );
  };

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="text-sm font-medium text-content">{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-content-muted">
          {hint}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {subjects.map((subject) => {
          const checked = selected.includes(subject.id);
          return (
            <label
              key={subject.id}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm',
                'transition-colors duration-base motion-reduce:transition-none',
                'focus-within:ring-2 focus-within:ring-primary',
                checked
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border text-content-muted hover:border-border-strong',
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-current"
                checked={checked}
                onChange={() => toggle(subject.id)}
              />
              {subject.name}
            </label>
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
