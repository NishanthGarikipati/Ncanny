import { MyWork } from '../../../components/content/MyWork';

export default function ActivityPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-semibold text-content">Activity</h1>
        <p className="mt-1 text-sm text-content-muted">
          Work you have published, including marks a Preceptor has left.
        </p>
      </header>
      <MyWork />
    </div>
  );
}
