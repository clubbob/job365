'use client';

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { type UserMode } from '@/lib/user-mode';

const hoverCardClassName =
  'h-full origin-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:border-primary/50 hover:bg-primary/[0.04] hover:shadow-card-hover group';

const AUDIENCES: Array<{
  mode: UserMode;
  title: string;
  description: string;
  points: string[];
}> = [
  {
    mode: 'jobseeker',
    title: '구직자',
    description: '취업을 준비하는 개인',
    points: [
      '알바부터 정규직까지 채용 정보를 찾아 바로 지원합니다.',
      '이력서를 등록·공개하면 구인자가 먼저 면접을 제안할 수 있습니다.',
    ],
  },
  {
    mode: 'recruiter',
    title: '구인자',
    description: '채용하는 회사',
    points: [
      '인재 정보를 살펴보고 맞는 구직자에게 면접을 제안합니다.',
      '채용 정보를 등록하고 지원 현황을 한곳에서 관리합니다.',
    ],
  },
];

const HIGHLIGHTS = [
  {
    title: '이용료 없음',
    body: '채용 정보 열람·지원, 채용 정보 등록 모두 이용 수수료가 없습니다.',
  },
  {
    title: '한 계정, 두 가지 이용',
    body: '로그인 한 번으로 구직자와 구인자를 바꿔 가며 이용할 수 있습니다.',
  },
  {
    title: '알바부터 정규직까지',
    body: '단기·시간제부터 정규 채용까지, 여러 근무 형태를 한곳에서 다룹니다.',
  },
];

export default function GuestHome() {
  const { user, loading } = useAuth();
  const { setMode } = useUserMode();
  const isLoggedIn = !loading && Boolean(user);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-5 py-8 text-white shadow-card sm:px-8 sm:py-10">
        <p className="text-sm font-semibold text-blue-100">100% 무료 이용·매칭</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          알바부터 정규직까지, 이용료 없이 연결합니다
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
          JobLink 365는 구직자와 구인자를 위한 무료 매칭 서비스입니다. 로그인 후 이용 주체를 고르면 바로 시작할 수
          있습니다.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                className="inline-flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl bg-white px-5 py-3.5 text-center shadow-lg ring-2 ring-white/90 transition hover:bg-blue-50 hover:shadow-xl active:scale-[0.99]"
                onClick={() => setMode('jobseeker', { navigate: true })}
              >
                <span className="text-base font-bold text-primary sm:text-lg">구직자로 시작</span>
                <span className="mt-0.5 text-sm font-semibold text-primary/75">(취업 개인)</span>
              </button>
              <button
                type="button"
                className="inline-flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl bg-white px-5 py-3.5 text-center shadow-lg ring-2 ring-white/90 transition hover:bg-blue-50 hover:shadow-xl active:scale-[0.99]"
                onClick={() => setMode('recruiter', { navigate: true })}
              >
                <span className="text-base font-bold text-primary sm:text-lg">구인자로 시작</span>
                <span className="mt-0.5 text-sm font-semibold text-primary/75">(채용 회사)</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-xl bg-white px-5 py-3.5 text-base font-bold text-primary shadow-lg ring-2 ring-white/90 transition hover:bg-blue-50 hover:shadow-xl sm:max-w-xs sm:text-lg"
            >
              로그인하고 시작하기
            </Link>
          )}
        </div>
      </section>

      <AdSlot placement="header" />

      <div className="grid gap-3 sm:grid-cols-2">
        {AUDIENCES.map((item) => (
          <Card
            key={item.mode}
            title={<span className="transition-colors group-hover:text-primary">{item.title}</span>}
            description={item.description}
            className={hoverCardClassName}
          >
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              {item.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-base font-bold text-foreground">왜 JobLink 365인가요?</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title}>
              <Card className={hoverCardClassName}>
                <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      {!isLoggedIn ? (
        <section className="rounded-xl border border-border bg-surface px-5 py-6 text-center shadow-card sm:px-8">
          <h2 className="text-base font-bold text-foreground">지금 무료로 시작해 보세요</h2>
          <p className="mt-2 text-sm text-muted">구글, 카카오톡, 네이버 계정으로 로그인할 수 있습니다.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            로그인
          </Link>
        </section>
      ) : null}
    </div>
  );
}
