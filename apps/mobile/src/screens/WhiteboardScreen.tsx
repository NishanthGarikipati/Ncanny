import { ContentType, type WorkCard } from '@ncanny/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { WorkList } from '../components/WorkList';
import { Banner, Button, Card, Chip, Muted, Screen } from '../components/ui';
import { getApiClient } from '../lib/api';

const STATIONS = [
  { id: 'all', label: 'Quad' },
  { id: ContentType.ESSAY, label: 'Library' },
  { id: ContentType.PAINTING, label: 'Studio' },
  { id: ContentType.ELOCUTION, label: 'Stage' },
  { id: ContentType.STUDY_ACTIVITY, label: 'Laboratory' },
] as const;

export function WhiteboardScreen() {
  const router = useRouter();
  const [works, setWorks] = useState<WorkCard[] | null>(null);
  const [station, setStation] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .content.feed({ limit: 24 }, { signal: controller.signal })
      .then((page) => setWorks(page.items))
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load the whiteboard.');
      });
    return () => controller.abort();
  }, []);

  return (
    <Screen title="Campus" subtitle="Pick a station. The same school work is on the web campus, which you play rather than watch.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {STATIONS.map((item) => (
          <Chip key={item.id} label={item.label} selected={station === item.id} onPress={() => setStation(item.id)} />
        ))}
      </View>
      {error ? <Banner tone="danger" message={error} /> : null}
      {works ? (
        <CampusList works={works} station={station} onCreate={() => router.push('/create')} onOpen={(id) => router.push(`/work/${id}`)} />
      ) : null}
      {!works && !error ? <Muted>Loading the campus</Muted> : null}
    </Screen>
  );
}

function CampusList({
  works,
  station,
  onCreate,
  onOpen,
}: {
  works: WorkCard[];
  station: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const visible = station === 'all' ? works : works.filter((work) => work.type === station);
  if (visible.length === 0) {
    return (
      <Card>
        <Muted>{works.length === 0 ? 'Nothing is on the campus yet.' : 'This station is quiet.'}</Muted>
        <Button label="Create work" onPress={onCreate} />
      </Card>
    );
  }
  return <WorkList works={visible} onOpen={onOpen} />;
}
