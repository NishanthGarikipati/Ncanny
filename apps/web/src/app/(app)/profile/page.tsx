'use client';

import { Alert, LoadingState } from '@ncanny/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '../../../lib/auth-store';

/** `/profile` is a convenience alias for the signed-in user's own profile. */
export default function OwnProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user?.cannyId) {
      router.replace(`/profile/${user.cannyId}`);
    }
  }, [user?.cannyId, router]);

  if (user && !user.cannyId) {
    return (
      <Alert tone="info" title="No Canny ID yet">
        Canny IDs are issued to Scholars and Preceptors. Your account does not have one.
      </Alert>
    );
  }

  return <LoadingState label="Opening your profile" />;
}
