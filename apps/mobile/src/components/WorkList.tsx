import type { WorkCard } from '@ncanny/types';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card, Muted } from './ui';

export function WorkList({
  works,
  onOpen,
}: {
  works: WorkCard[];
  onOpen: (id: string) => void;
}) {
  const colors = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {works.map((work) => (
        <Pressable
          key={work.id}
          accessibilityRole="button"
          accessibilityLabel={work.title}
          onPress={() => onOpen(work.id)}
        >
          <Card>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
              {work.type.replaceAll('_', ' ')}
            </Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{work.title}</Text>
            <Muted>
              {work.authorName} · {work.subjectName}
              {work.review ? ` · Marked ${work.review.score}/100` : ''}
            </Muted>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
