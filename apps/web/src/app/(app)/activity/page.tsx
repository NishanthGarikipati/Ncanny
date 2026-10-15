import { MyWork } from '../../../components/content/MyWork';

export default function ActivityPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <p className="kicker">Quests</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-content">Your board</h1>
        <p className="mt-1 text-sm text-content-muted">
          Pieces you published, and the marks a Preceptor has left on them.
        </p>
      </header>
      <MyWork />
    </div>
  );
}
