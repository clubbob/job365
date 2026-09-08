'use client';

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import JobList from '@/features/jobs/JobList';
import { useAuth } from '@/features/auth/auth-context';

export default function GuestHome() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && Boolean(user);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-5 py-8 text-white shadow-card sm:px-8">
        <p className="text-sm font-semibold text-blue-100">100% 무료 이용·매칭</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          100% 무료 이용·매칭 서비스, 파트타임부터 정규직까지
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
          무료 이용·매칭 서비스입니다. 구인자, 구직자 모두 이용료가 없습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/jobs"
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-blue-50"
          >
            채용 정보 보기
          </Link>
          <Link
            href="/talents"
            className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            인재 정보 보기
          </Link>
          {!isLoggedIn ? (
            <Link
              href="/login"
              className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              로그인
            </Link>
          ) : null}
        </div>
      </section>

      <AdSlot placement="header" />

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">최근 채용 정보</h2>
          <p className="mt-1 text-sm text-muted">관심 있는 근무 형태를 골라 보세요.</p>
        </div>
        <Link href="/jobs" className="text-sm font-semibold text-primary hover:underline">
          전체 보기
        </Link>
      </div>

      <JobList limit={6} filterAsLinks />
    </div>
  );
}
