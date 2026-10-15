import type { Metadata } from 'next';
import Link from 'next/link';
import { AttendanceForm } from '../../components/auth/AttendanceForm';

export const metadata: Metadata = {
  title: 'Attendance',
  description: 'Mark your attendance to enter Ncanny.',
};

export default function AttendancePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <div className="hud-frame mb-6 p-5 sm:p-7">
        <div className="flex justify-center">
          <h1 className="neon-title text-xl sm:text-2xl">Ncanny Sign In</h1>
        </div>
        <div className="mt-5 grid items-center gap-6 md:grid-cols-[11rem_1fr]">
          <div className="flex flex-col items-center">
            <div className="portrait portrait-lg" aria-hidden="true">
              N
            </div>
            <Link href="/" className="id-plate w-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Ncanny
            </Link>
          </div>
          <div>
            <p className="text-sm text-content-muted">
              Mark attendance with email or a phone code. Then the whiteboard opens.
            </p>
            <div className="mt-5">
              <AttendanceForm />
            </div>
          </div>
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
