import { Whiteboard } from '../../../components/content/Whiteboard';

export default function ExplorePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-semibold text-content">Whiteboard</h1>
        <p className="mt-1 text-sm text-content-muted">
          Published work from your school. Open a piece here, or walk the same wall in the hall.
        </p>
      </header>
      <Whiteboard />
    </div>
  );
}
