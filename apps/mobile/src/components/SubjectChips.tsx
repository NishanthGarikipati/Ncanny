import type { Subject } from '@ncanny/types';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { Chip } from './ui';

export function SubjectChips({
  legend,
  hint,
  subjects,
  selected,
  onChange,
  error,
}: {
  legend: string;
  hint?: string;
  subjects: Subject[];
  selected: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const colors = useTheme();

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{legend}</Text>
      {hint ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{hint}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {subjects.map((subject) => (
          <Chip
            key={subject.id}
            label={subject.name}
            selected={selected.includes(subject.id)}
            onPress={() => toggle(subject.id)}
          />
        ))}
      </View>
      {subjects.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          Subjects could not be loaded. Check your connection and try again.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
