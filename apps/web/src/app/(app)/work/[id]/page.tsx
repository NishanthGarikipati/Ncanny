import { WorkPage } from '../../../../components/content/WorkPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkPage id={id} />;
}
