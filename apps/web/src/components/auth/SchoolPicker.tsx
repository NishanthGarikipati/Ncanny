'use client';

import type { SchoolSummary } from '@ncanny/types';
import { Button, FormField, Input, Spinner } from '@ncanny/ui';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import type { FieldErrors } from '../../lib/form';

export interface SchoolSelection {
  schoolId?: string;
  schoolName?: string;
  schoolAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

interface SchoolPickerProps {
  value: SchoolSelection;
  onChange: (value: SchoolSelection) => void;
  errors: FieldErrors;
}

/**
 * Search first, add manually only if the school is genuinely missing. A new
 * school is created unverified, so an unrecognised name cannot be used to claim
 * membership of an existing school (DL-0011).
 */
export function SchoolPicker({ value, onChange, errors }: SchoolPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState(false);
  const [selected, setSelected] = useState<SchoolSummary | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selected) {
      setResults([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      getApiClient()
        .schools.search({ q: trimmed, limit: 8 }, { signal: controller.signal })
        .then((page) => setResults(page.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  if (selected) {
    return (
      <div className="rounded-md border border-border bg-surface-sunken p-4">
        <p className="text-sm font-medium text-content">{selected.name}</p>
        <p className="text-sm text-content-muted">
          {selected.address.city}, {selected.address.country}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => {
            setSelected(null);
            setQuery('');
            onChange({});
          }}
        >
          Choose a different school
        </Button>
      </div>
    );
  }

  if (manual) {
    const address = value.schoolAddress;
    const update = (patch: Partial<NonNullable<SchoolSelection['schoolAddress']>>) =>
      onChange({
        schoolName: value.schoolName,
        schoolAddress: {
          line1: '',
          city: '',
          country: '',
          ...address,
          ...patch,
        },
      });

    return (
      <div className="flex flex-col gap-4">
        <FormField label="School name" error={errors.schoolName} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={value.schoolName ?? ''}
              onChange={(event) =>
                onChange({ ...value, schoolId: undefined, schoolName: event.target.value })
              }
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        <FormField label="Street address" error={errors['schoolAddress.line1']} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={address?.line1 ?? ''}
              onChange={(event) => update({ line1: event.target.value })}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="City" error={errors['schoolAddress.city']} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                value={address?.city ?? ''}
                onChange={(event) => update({ city: event.target.value })}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </FormField>

          <FormField label="Country" error={errors['schoolAddress.country']} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                value={address?.country ?? ''}
                onChange={(event) => update({ country: event.target.value })}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </FormField>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setManual(false);
            onChange({});
          }}
        >
          Search for my school instead
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField
        label="School"
        hint="Start typing to find your school."
        error={errors.schoolName}
        required
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </FormField>

      {searching && (
        <p className="flex items-center gap-2 text-sm text-content-muted">
          <Spinner size="sm" label={null} /> Searching schools
        </p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {results.map((school) => (
            <li key={school.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(school);
                  onChange({ schoolId: school.id });
                }}
                className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <span className="text-sm font-medium text-content">{school.name}</span>
                <span className="text-sm text-content-muted">
                  {school.address.city}, {school.address.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="ghost" size="sm" onClick={() => setManual(true)}>
        My school is not listed
      </Button>
    </div>
  );
}
