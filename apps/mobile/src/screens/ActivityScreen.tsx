import type { WorkCard } from '@ncanny/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { WorkList } from '../components/WorkList';
import { Banner, Button, Card, Muted, Screen } from '../components/ui';
import { getApiClient } from '../lib/api';

export function ActivityScreen() {
  const router = useRouter();
  const [works, setWorks] = useState<WorkCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .content.mine({ signal: controller.signal })
      .then(setWorks)
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load your work.');
      });
    return () => controller.abort();
  }, []);

  return (
    <Screen title="Activity" subtitle="Work you published, and any mark a Preceptor left.">
      {error ? <Banner tone="danger" message={error} /> : null}
      {works && works.length === 0 ? (
        <Card>
          <Muted>You have not published yet.</Muted>
          <Button label="Create work" onPress={() => router.push('/create')} />
        </Card>
      ) : null}
      {works && works.length > 0 ? (
        <WorkList works={works} onOpen={(id) => router.push(`/work/${id}`)} />
      ) : null}
      {!works && !error ? <Muted>Loading your work</Muted> : null}
    </Screen>
  );
}
