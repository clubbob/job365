import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryPageClient from '@/features/jobs/CategoryPageClient';
import { isJobWorkType, JOB_WORK_TYPES, WORK_TYPE_LABELS } from '@/types/job';

type CategoryPageProps = {
  params: Promise<{ workType: string }>;
};

export function generateStaticParams() {
  return JOB_WORK_TYPES.map((workType) => ({ workType }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { workType } = await params;
  if (!isJobWorkType(workType)) {
    return { title: '채용 카테고리 | JOB 365' };
  }

  const label = WORK_TYPE_LABELS[workType];
  return {
    title: `${label} | JOB 365`,
    description: `${label} 채용 정보와 이력서 정보를 확인하세요.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { workType } = await params;
  if (!isJobWorkType(workType)) notFound();

  return <CategoryPageClient workType={workType} />;
}
