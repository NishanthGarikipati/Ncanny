import { ProfileView } from '../../../../components/profile/ProfileView';

export default async function ProfilePage({ params }: { params: Promise<{ cannyId: string }> }) {
  const { cannyId } = await params;
  return <ProfileView cannyId={cannyId.toUpperCase()} />;
}
