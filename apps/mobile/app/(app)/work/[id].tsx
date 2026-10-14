import { useLocalSearchParams } from 'expo-router';
import { WorkScreen } from '../../../src/screens/WorkScreen';

export default function WorkRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return null;
  return <WorkScreen id={id} />;
}
