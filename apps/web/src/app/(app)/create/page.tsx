import { CreateWork } from '../../../components/content/CreateWork';

export default function CreatePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-semibold text-content">Create</h1>
        <p className="mt-1 text-sm text-content-muted">
          Publish an essay, painting, elocution or study activity for your school. A Preceptor marks
          it by hand.
        </p>
      </header>
      <CreateWork />
    </div>
  );
}
