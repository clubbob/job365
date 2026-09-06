import { redirect } from 'next/navigation';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const qs = next ? `?next=${encodeURIComponent(next)}` : '';
  redirect(`/login${qs}`);
}
