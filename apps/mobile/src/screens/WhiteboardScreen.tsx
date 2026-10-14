import type { WorkCard } from '@ncanny/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { WorkList } from '../components/WorkList';
import { Banner, Button, Card, Muted, Screen } from '../components/ui';
import { getApiClient } from '../lib/api';

export function WhiteboardScreen() {
  const router = useRouter();
  const [works, setWorks] = useState<WorkCard[] | null>(null);
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
    <Screen
      title="Whiteboard"
      subtitle="Work from your school. The walkable hall is on the web app."
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      {works && works.length === 0 ? (
        <Card>
          <Muted>Nothing is on the wall yet.</Muted>
          <Button label="Create work" onPress={() => router.push('/create')} />
        </Card>
      ) : null}
      {works && works.length > 0 ? (
        <WorkList works={works} onOpen={(id) => router.push(`/work/${id}`)} />
      ) : null}
      {!works && !error ? <Muted>Loading the whiteboard</Muted> : null}
    </Screen>
  );
}
