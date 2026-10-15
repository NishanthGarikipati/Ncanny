import { CreateWork } from '../../../components/content/CreateWork';

export default function CreatePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header>
        <p className="kicker">Create</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-content">Choose your station</h1>
        <p className="mt-1 text-sm text-content-muted">
          Pick the kind of work, then publish it onto the campus for your school. A Preceptor marks it by hand.
        </p>
      </header>
      <CreateWork />
    </div>
  );
}
