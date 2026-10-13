import { useLocalSearchParams } from 'expo-router';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';

export default function PersonScreen() {
  const params = useLocalSearchParams<{ cannyId: string }>();
  const cannyId = (Array.isArray(params.cannyId) ? params.cannyId[0] : params.cannyId) ?? '';
  return <ProfileScreen cannyId={cannyId.toUpperCase()} />;
}
