import TalentNewPageClient from '@/features/talents/TalentNewPageClient';

export default async function TalentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; from?: string }>;
}) {
  const { edit, from } = await searchParams;
  return <TalentNewPageClient editId={edit} from={from} />;
}
