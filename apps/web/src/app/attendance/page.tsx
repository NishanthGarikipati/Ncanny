import type { Metadata } from 'next';
import Link from 'next/link';
import { AttendanceForm } from '../../components/auth/AttendanceForm';

export const metadata: Metadata = {
  title: 'Attendance',
  description: 'Mark your attendance to enter Ncanny.',
};

export default function AttendancePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="hud-frame mb-6 p-5">
        <Link
          href="/"
          className="text-sm text-content-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Ncanny
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-content">Mark attendance</h1>
        <p className="mt-1 text-sm text-content-muted">
          Signing in records your attendance streak for the day. Then the campus opens.
        </p>
        <div className="mt-5">
          <AttendanceForm />
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-content-muted">
        New to Ncanny?{' '}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Create your Canny ID
        </Link>
      </p>
    </main>
  );
}
