import type { SchoolSummary } from '@ncanny/types';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getApiClient } from '../lib/api';
import type { FieldErrors } from '../lib/form';
import { useTheme } from '../theme/theme';
import { Button, Muted, TextField } from './ui';

export interface SchoolSelection {
  schoolId?: string;
  schoolName?: string;
  schoolAddress?: {
    line1: string;
    city: string;
    country: string;
  };
}

/**
 * Search first. A school that is not listed is entered by hand and created
 * unverified, so an unrecognised name cannot claim an existing school (DL-0011).
 */
export function SchoolField({
  value,
  onChange,
  errors,
}: {
  value: SchoolSelection;
  onChange: (value: SchoolSelection) => void;
  errors: FieldErrors;
}) {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolSummary[]>([]);
  const [manual, setManual] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selectedName) {
      setResults([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      getApiClient()
        .schools.search({ q: trimmed, limit: 8 }, { signal: controller.signal })
        .then((page) => setResults(page.items))
        .catch(() => setResults([]));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedName]);

  if (selectedName && value.schoolId) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{selectedName}</Text>
        <Button
          label="Choose a different school"
          variant="ghost"
          onPress={() => {
            setSelectedName(null);
            setQuery('');
            onChange({});
          }}
        />
      </View>
    );
  }

  if (manual) {
    const address = value.schoolAddress;
    return (
      <View style={{ gap: 12 }}>
        <TextField
          label="School name"
          error={errors.schoolName}
          value={value.schoolName ?? ''}
          onChangeText={(schoolName) => onChange({ schoolName, schoolAddress: address })}
        />
        <TextField
          label="Street address"
          error={errors['schoolAddress.line1']}
          value={address?.line1 ?? ''}
          onChangeText={(line1) =>
            onChange({
              schoolName: value.schoolName,
              schoolAddress: { line1, city: address?.city ?? '', country: address?.country ?? '' },
            })
          }
        />
        <TextField
          label="City"
          error={errors['schoolAddress.city']}
          value={address?.city ?? ''}
          onChangeText={(city) =>
            onChange({
              schoolName: value.schoolName,
              schoolAddress: { line1: address?.line1 ?? '', city, country: address?.country ?? '' },
            })
          }
        />
        <TextField
          label="Country"
          error={errors['schoolAddress.country']}
          value={address?.country ?? ''}
          onChangeText={(country) =>
            onChange({
              schoolName: value.schoolName,
              schoolAddress: { line1: address?.line1 ?? '', city: address?.city ?? '', country },
            })
          }
        />
        <Button
          label="Search for my school instead"
          variant="ghost"
          onPress={() => {
            setManual(false);
            onChange({});
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <TextField
        label="School"
        hint="Start typing to find your school."
        error={errors.schoolName}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      {results.map((school) => (
        <Pressable
          key={school.id}
          accessibilityRole="button"
          accessibilityLabel={`${school.name}, ${school.address.city}`}
          onPress={() => {
            setSelectedName(school.name);
            onChange({ schoolId: school.id });
          }}
          style={{
            minHeight: 48,
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>{school.name}</Text>
          <Muted>
            {school.address.city}, {school.address.country}
          </Muted>
        </Pressable>
      ))}
      <Button label="My school is not listed" variant="ghost" onPress={() => setManual(true)} />
    </View>
  );
}
