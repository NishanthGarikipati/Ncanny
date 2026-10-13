import { Muted, Screen } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/lib/auth-store';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';

export default function OwnProfileTab() {
  const user = useAuthStore((state) => state.user);

  if (!user?.cannyId) {
    return (
      <Screen title="Profile">
        <Muted>Canny IDs are issued to Scholars and Preceptors. This account does not have one.</Muted>
      </Screen>
    );
  }

  return <ProfileScreen cannyId={user.cannyId} />;
}
