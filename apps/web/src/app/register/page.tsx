import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '../../components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Join Ncanny',
  description: 'Create your Canny ID and join your school on Ncanny.',
};

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="hud-frame p-5 sm:p-6">
      <Link
        href="/"
        className="text-sm text-content-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Ncanny
      </Link>
      <h1 className="neon-title mt-3 text-2xl sm:text-3xl">Registration</h1>
      <p className="mt-1 text-sm text-content-muted">
        Your Canny ID is your permanent academic identity on Ncanny.
      </p>

      <div className="mt-8">
        <RegisterForm />
      </div>
      </div>

      <p className="mt-6 text-center text-sm text-content-muted">
        Already have an account?{' '}
        <Link
          href="/attendance"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Mark attendance
        </Link>
      </p>
    </main>
  );
}
