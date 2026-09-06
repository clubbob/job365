'use client';

import GuestHome from '@/features/home/GuestHome';
import JobseekerHome from '@/features/home/JobseekerHome';
import RecruiterHome from '@/features/home/RecruiterHome';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';

export default function HomePageClient() {
  const { user, loading } = useAuth();
  const { mode, ready } = useUserMode();

  if (loading || !ready) {
    return <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!user || !mode) {
    return <GuestHome />;
  }

  if (mode === 'recruiter') {
    return <RecruiterHome />;
  }

  return <JobseekerHome />;
}
