'use client';

import GuestHome from '@/features/home/GuestHome';
import JobseekerHome from '@/features/home/JobseekerHome';
import RecruiterHome from '@/features/home/RecruiterHome';
import { useUserMode } from '@/features/mode/mode-context';

export default function HomePageClient() {
  const { mode, ready } = useUserMode();

  if (ready && mode === 'jobseeker') return <JobseekerHome />;
  if (ready && mode === 'recruiter') return <RecruiterHome />;
  return <GuestHome />;
}
